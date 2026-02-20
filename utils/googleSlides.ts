
import { AppState, CategoryType } from '../types';
import { PROPOSAL_TEXTS, INFRA_DETAILS, AMBIENTATION_IMAGES, INFRA_CATALOG } from '../constants';

// Colors
const PURPLE = { red: 0.443, green: 0.278, blue: 0.478 }; // #71477A
const GREEN = { red: 0.545, green: 0.749, blue: 0.337 };  // #8BBF56
const WHITE = { red: 1, green: 1, blue: 1 };
const BLACK = { red: 0, green: 0, blue: 0 };
const GRAY = { red: 0.4, green: 0.4, blue: 0.4 };
const GRAY_LIGHT = { red: 0.95, green: 0.95, blue: 0.95 };

// Helper to get public URL
const getLogoUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn("Google Slides API cannot access localhost images. Using placeholder for Logo.");
        return "https://placehold.co/200x60/transparent/71477A.png?text=LITTLE+MAKER";
    }
    return `${window.location.origin}/images/logo_lm.png`;
};

// Helper to determine text content based on selection (Replicated logic from ProposalView)
const getProposalText = (category: CategoryType, selectedIds: string[], calculations: any) => {
    // Capacity logic
    let furnitureCap = 0;
    let toolCap = 0;
    
    // Simple capacity calc based on IDs
    if (category === 'maker') {
        if (selectedIds.includes('maker_padrao_24')) furnitureCap += 24;
        if (selectedIds.includes('maker_up_12')) furnitureCap += 12;
        if (selectedIds.includes('maker_up_6')) furnitureCap += 6;
    } else if (category === 'midia') {
        if (selectedIds.includes('midia_padrao_24')) furnitureCap += 24;
        if (selectedIds.includes('midia_up_12')) furnitureCap += 12;
        if (selectedIds.includes('midia_up_6')) furnitureCap += 6;
    } else if (category === 'infantil') {
        if (selectedIds.includes('infantil_padrao_18')) furnitureCap += 18;
        if (selectedIds.includes('infantil_up_12')) furnitureCap += 12;
        if (selectedIds.includes('infantil_up_6')) furnitureCap += 6;
    }

    toolCap = furnitureCap;
    if (category === 'maker' && selectedIds.includes('maker_ferr_red_18')) toolCap = 18;
    else if (category === 'maker' && selectedIds.includes('maker_minima')) {
        toolCap = 24; 
        if (selectedIds.includes('maker_ferr_red_18')) toolCap = 18;
    }
    if (category === 'infantil' && selectedIds.includes('infantil_carrinho')) {
        toolCap = 18; 
        if (selectedIds.includes('infantil_ferr_up_6')) toolCap += 6;
    }

    const num = furnitureCap || 0;
    const numf = toolCap || 0;
    
    const replacePlaceholders = (text: string) => text.replace('{{num}}', num.toString()).replace('{{numf}}', numf.toString());

    let t: any = null;

    if (category === 'maker') {
        const isMinima = selectedIds.includes('maker_minima');
        const hasReduzida = selectedIds.includes('maker_ferr_red_18');
        const hasPadrao = selectedIds.includes('maker_ferr_padrao');
        const hasDigitais = selectedIds.includes('maker_ferr_digitais');
        const hasPC = selectedIds.includes('maker_ferr_pc');
        
        if (isMinima) {
            if (hasReduzida) t = PROPOSAL_TEXTS.maker_minima_reduzida;
            else if (hasPadrao) t = PROPOSAL_TEXTS.maker_minima_padrao;
            else t = PROPOSAL_TEXTS.maker_minima_solo;
        } else {
            if (hasPC && hasDigitais) t = PROPOSAL_TEXTS.maker_completa_pc;
            else if (hasDigitais) t = PROPOSAL_TEXTS.maker_completa;
            else t = PROPOSAL_TEXTS.maker_padrao;
        }
    } else if (category === 'midia') {
        const hasPC = selectedIds.includes('midia_ferr_pc');
        t = hasPC ? PROPOSAL_TEXTS.midia_com_computadores : PROPOSAL_TEXTS.midia_padrao;
    } else if (category === 'infantil') {
         if (selectedIds.includes('infantil_carrinho')) t = PROPOSAL_TEXTS.infantil_carrinho;
         else t = PROPOSAL_TEXTS.infantil_oficina;
    }

    if (!t) return null;

    return {
        title: replacePlaceholders(t.title),
        subtitle: t.subtitle,
        items: t.items.map((i: string) => replacePlaceholders(i))
    };
};

export const createGoogleSlidePresentation = async (
  accessToken: string,
  appState: AppState,
  calculations: any
) => {
  const { client, commercial, selectedInfraIds } = appState;
  const LOGO_URL = getLogoUrl();
  
  // 1. Create Presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `Proposta - ${client.schoolName}`,
    }),
  });

  const presentation = await createRes.json();

  if (!createRes.ok) {
      console.error('Google Slides API Error (Create):', presentation);
      throw new Error(presentation.error?.message || 'Erro ao criar apresentação no Google Slides.');
  }

  const presentationId = presentation.presentationId;
  
  // 1.5 Get the ID of the default first slide to delete it later
  let defaultSlideId: string | null = null;
  try {
      const getRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const fullPresentation = await getRes.json();
      if (fullPresentation.slides && fullPresentation.slides.length > 0) {
          defaultSlideId = fullPresentation.slides[0].objectId;
      }
  } catch (e) {
      console.warn("Could not fetch default slide ID, blank page might remain.");
  }

  const requests: any[] = [];

  // --- HELPER FUNCTIONS ---
  let slideIndex = 0;
  const createSlideId = (idx: number) => `slide_${idx}_${Date.now()}`;

  const addSlide = (layout = 'BLANK') => {
    const objectId = createSlideId(slideIndex++);
    requests.push({
      createSlide: {
        objectId,
        slideLayoutReference: { predefinedLayout: layout }
      }
    });
    return objectId;
  };

  const addText = (pageId: string, text: string, x: number, y: number, w: number, h: number, fontSize: number, color: any = BLACK, bold = false, align = 'START') => {
    const elementId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    requests.push({
      createShape: {
        objectId: elementId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: w, unit: 'PT' }, height: { magnitude: h, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'PT' }
        }
      }
    });
    requests.push({
      insertText: {
        objectId: elementId,
        text: text,
        insertionIndex: 0
      }
    });
    requests.push({
      updateTextStyle: {
        objectId: elementId,
        style: {
          fontFamily: 'Montserrat',
          fontSize: { magnitude: fontSize, unit: 'PT' },
          foregroundColor: { opaqueColor: { rgbColor: color } },
          bold: bold
        },
        fields: 'foregroundColor,bold,fontFamily,fontSize'
      }
    });
    requests.push({
      updateParagraphStyle: {
        objectId: elementId,
        style: { alignment: align },
        fields: 'alignment'
      }
    });
    return elementId;
  };

  const addImage = (pageId: string, url: string, x: number, y: number, w: number, h: number) => {
    if (!url || !url.startsWith('http')) return;
    const elementId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    requests.push({
        createImage: {
            objectId: elementId,
            url: url,
            elementProperties: {
                pageObjectId: pageId,
                size: { width: { magnitude: w, unit: 'PT' }, height: { magnitude: h, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'PT' }
            }
        }
    });
  };

  // --- SLIDE 1: CAPA ---
  const coverId = addSlide();
  
  // Header Bar
  requests.push({
      createShape: {
          objectId: `header_${coverId}`,
          shapeType: 'RECTANGLE',
          elementProperties: {
              pageObjectId: coverId,
              size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: `header_${coverId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: PURPLE } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

  addImage(coverId, LOGO_URL, 20, 10, 100, 30);
  addText(coverId, "Proposta Comercial", 0, 150, 720, 50, 32, PURPLE, true, 'CENTER');
  addText(coverId, client.schoolName || 'Escola', 0, 210, 720, 40, 24, GRAY, false, 'CENTER');
  const dateStr = new Date(client.date).toLocaleDateString('pt-BR');
  addText(coverId, `A/C: ${client.contactName} • ${dateStr}`, 0, 260, 720, 30, 14, GRAY, false, 'CENTER');

  requests.push({
    createShape: {
        objectId: `footer_${coverId}`,
        shapeType: 'RECTANGLE',
        elementProperties: {
            pageObjectId: coverId,
            size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 15, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 390, unit: 'PT' } 
        }
    }
  });
  requests.push({ updateShapeProperties: { objectId: `footer_${coverId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });


  // --- SLIDE 2: ESCOPO DO PROJETO (NOVO) ---
  // Gather contents
  const scopeContents: any[] = [];
  ['infantil', 'maker', 'midia'].forEach(cat => {
      // Check if any item of this category is selected
      const hasItem = selectedInfraIds.some(id => {
          const item = INFRA_CATALOG.find(i => i.id === id);
          return item && item.category === cat;
      });
      
      if (hasItem) {
          const textData = getProposalText(cat as CategoryType, selectedInfraIds, calculations);
          if (textData) scopeContents.push({ ...textData, category: cat });
      }
  });

  if (scopeContents.length > 0) {
      const scopeId = addSlide();
      
      // Header
      requests.push({
        createShape: {
            objectId: `header_${scopeId}`,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: scopeId,
                size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
            }
        }
      });
      requests.push({ updateShapeProperties: { objectId: `header_${scopeId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: PURPLE } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
      addImage(scopeId, LOGO_URL, 20, 10, 100, 30);
      addText(scopeId, "Escopo do Projeto", 30, 70, 500, 30, 18, PURPLE, true);

      // Columns Calculation
      const colCount = scopeContents.length;
      const margin = 30;
      const availableWidth = 720 - (margin * 2);
      const gutter = 20;
      const colWidth = (availableWidth - (gutter * (colCount - 1))) / colCount;

      scopeContents.forEach((content, idx) => {
          const xPos = margin + (idx * (colWidth + gutter));
          const yPos = 110;

          // Title
          addText(scopeId, content.title, xPos, yPos, colWidth, 30, 12, GREEN, true);
          
          // Subtitle
          addText(scopeId, content.subtitle, xPos, yPos + 25, colWidth, 20, 9, GRAY, true); // Italic? No API for italic easily in wrapper, use bold/gray to distinct

          // Items
          const listText = content.items.map((it: string) => `• ${it}`).join('\n');
          const listId = addText(scopeId, listText, xPos, yPos + 50, colWidth, 250, 9, BLACK);
          requests.push({
            updateParagraphStyle: {
                objectId: listId,
                style: { lineSpacing: 120 },
                fields: 'lineSpacing'
            }
          });
      });

      // Footer
      requests.push({
        createShape: {
            objectId: `footer_${scopeId}`,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: scopeId,
                size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 15, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 390, unit: 'PT' }
            }
        }
      });
      requests.push({ updateShapeProperties: { objectId: `footer_${scopeId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
  }


  // --- SLIDE 3: VALORES (Condições Comerciais) ---
  const valuesId = addSlide();
  
  // Header Bar Reuse
  requests.push({
    createShape: {
        objectId: `header_${valuesId}`,
        shapeType: 'RECTANGLE',
        elementProperties: {
            pageObjectId: valuesId,
            size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } }, 
            transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
        }
    }
  });
  requests.push({ updateShapeProperties: { objectId: `header_${valuesId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: PURPLE } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
  addImage(valuesId, LOGO_URL, 20, 10, 100, 30);

  addText(valuesId, "Condições Comerciais", 30, 70, 500, 30, 18, PURPLE, true);

  // --- TABLE 1: MATERIAL ---
  const tableId1 = `table_mat_${Date.now()}`;
  requests.push({
    createTable: {
        objectId: tableId1,
        elementProperties: {
            pageObjectId: valuesId,
            transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 120, unit: 'PT' },
            size: { width: { magnitude: 300, unit: 'PT' }, height: { magnitude: 100, unit: 'PT' } }
        },
        rows: 4, 
        columns: 2
    }
  });

  const matData = [
      ["Material do Aluno", ""],
      ["Total de Alunos", calculations.totalStudents.toString()],
      ["Investimento Aluno/Ano", (calculations.totalMaterialYear / calculations.totalStudents).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ["Investimento Aluno/Mês", (calculations.totalMaterialYear / calculations.totalStudents / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
  ];

  const insertCellText = (tableId: string, row: number, col: number, text: string, fontSize = 10, bold = false, color: any = BLACK, align = 'START') => {
      requests.push({
          insertText: {
              objectId: tableId,
              cellLocation: { rowIndex: row, columnIndex: col },
              text: text,
              insertionIndex: 0
          }
      });
      requests.push({
          updateTextStyle: {
              objectId: tableId,
              cellLocation: { rowIndex: row, columnIndex: col },
              style: { 
                  fontFamily: 'Montserrat', 
                  fontSize: { magnitude: fontSize, unit: 'PT' }, 
                  bold: bold, 
                  foregroundColor: { opaqueColor: { rgbColor: color } } 
              },
              fields: 'foregroundColor,bold,fontFamily,fontSize'
          }
      });
      requests.push({
          updateParagraphStyle: {
              objectId: tableId,
              cellLocation: { rowIndex: row, columnIndex: col },
              style: { alignment: align },
              fields: 'alignment'
          }
      });
  };

  insertCellText(tableId1, 0, 0, "Material do Aluno", 11, true, WHITE, 'CENTER');
  requests.push({ mergeTableCells: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 } } });
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } } }, fields: 'tableCellBackgroundFill' } });

  insertCellText(tableId1, 1, 0, "Total de Alunos");
  insertCellText(tableId1, 1, 1, matData[1][1], 10, true, BLACK, 'END');
  insertCellText(tableId1, 2, 0, "Investimento Aluno/Ano");
  insertCellText(tableId1, 2, 1, matData[2][1], 10, true, BLACK, 'END');
  insertCellText(tableId1, 3, 0, "Investimento Aluno/Mês", 11, true);
  insertCellText(tableId1, 3, 1, matData[3][1], 12, true, BLACK, 'END');
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 3, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } } }, fields: 'tableCellBackgroundFill' } });


  // --- TABLE 2: INFRA ---
  if (calculations.totalInfra > 0) {
    const tableId2 = `table_infra_${Date.now()}`;
    requests.push({
        createTable: {
            objectId: tableId2,
            elementProperties: {
                pageObjectId: valuesId,
                transform: { scaleX: 1, scaleY: 1, translateX: 370, translateY: 120, unit: 'PT' },
                size: { width: { magnitude: 320, unit: 'PT' }, height: { magnitude: 100, unit: 'PT' } }
            },
            rows: 3, 
            columns: 2
        }
    });
    const infraData = [
        ["Infraestrutura", ""],
        ["Total Final (Único)", calculations.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ["Parcelamento (3x)", (calculations.totalInfra / 3).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
    ];
    insertCellText(tableId2, 0, 0, "Infraestrutura (Ambientação e Ferramentas)", 11, true, WHITE, 'CENTER');
    requests.push({ mergeTableCells: { objectId: tableId2, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 } } });
    requests.push({ updateTableCellProperties: { objectId: tableId2, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } } }, fields: 'tableCellBackgroundFill' } });

    insertCellText(tableId2, 1, 0, "Total Final (Único)", 10, true);
    insertCellText(tableId2, 1, 1, infraData[1][1], 11, true, BLACK, 'END');
    insertCellText(tableId2, 2, 0, "Parcelamento (3x)", 11, true);
    insertCellText(tableId2, 2, 1, infraData[2][1], 12, true, BLACK, 'END');
    requests.push({ updateTableCellProperties: { objectId: tableId2, tableRange: { location: { rowIndex: 2, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } } }, fields: 'tableCellBackgroundFill' } });
  }

  requests.push({
    createShape: {
        objectId: `footer_${valuesId}`,
        shapeType: 'RECTANGLE',
        elementProperties: {
            pageObjectId: valuesId,
            size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 15, unit: 'PT' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 390, unit: 'PT' }
        }
    }
  });
  requests.push({ updateShapeProperties: { objectId: `footer_${valuesId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });


  // --- SLIDES 4+: TECH SPECS (Memorial Descritivo) ---
  const addSpecSlide = (category: string, title: string) => {
      const slideId = addSlide();
      
      // Header
      requests.push({
        createShape: {
            objectId: `header_${slideId}`,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } }, 
                transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
            }
        }
      });
      requests.push({ updateShapeProperties: { objectId: `header_${slideId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: PURPLE } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
      addImage(slideId, LOGO_URL, 20, 10, 100, 30);
      
      addText(slideId, `Memorial Descritivo - ${title}`, 30, 70, 600, 30, 18, PURPLE, true);

      // Footer
      requests.push({
        createShape: {
            objectId: `footer_${slideId}`,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: slideId,
                size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 15, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 390, unit: 'PT' }
            }
        }
      });
      requests.push({ updateShapeProperties: { objectId: `footer_${slideId}`, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

      return slideId;
  };

  const categories: CategoryType[] = ['maker', 'midia', 'infantil'];
  
  categories.forEach(cat => {
      const items = selectedInfraIds.filter(id => {
          const infraItem = INFRA_CATALOG.find(i => i.id === id);
          return infraItem && infraItem.category === cat;
      });

      if (items.length === 0) return;

      const catTitle = cat === 'maker' ? 'Espaço Maker' : cat === 'midia' ? 'Sala de Mídia' : 'Espaço Infantil';
      const slideId = addSpecSlide(cat, catTitle);

      // Determine Image URL
      let imgUrl = "";
      if (cat === 'maker') {
        if (selectedInfraIds.includes('maker_minima')) imgUrl = AMBIENTATION_IMAGES['maker_minima'];
        else imgUrl = AMBIENTATION_IMAGES['maker_padrao'];
      } else if (cat === 'midia') {
        imgUrl = AMBIENTATION_IMAGES['midia_padrao'];
      } else if (cat === 'infantil') {
        if (selectedInfraIds.includes('infantil_carrinho')) imgUrl = AMBIENTATION_IMAGES['infantil_carrinho'];
        else imgUrl = AMBIENTATION_IMAGES['infantil_oficina'];
      }

      // ADD IMAGE (LEFT SIDE)
      if (imgUrl) {
          addImage(slideId, imgUrl, 30, 120, 260, 200);
      }

      // Aggregate Items + Identity Items
      const aggregatedRegular: Record<string, number> = {};
      const aggregatedIdentity: Record<string, number> = {};

      items.forEach(id => {
          const details = INFRA_DETAILS[id];
          if (details) {
              details.items.forEach(item => {
                  const key = item.name.trim();
                  aggregatedRegular[key] = (aggregatedRegular[key] || 0) + item.qty;
              });
              if (details.identityItems) {
                  details.identityItems.forEach(item => {
                      const key = item.name.trim();
                      aggregatedIdentity[key] = (aggregatedIdentity[key] || 0) + item.qty;
                  });
              }
          }
      });

      // Combine for list
      const itemList = Object.entries(aggregatedRegular).sort((a, b) => a[0].localeCompare(b[0]));
      const identityList = Object.entries(aggregatedIdentity).sort((a, b) => a[0].localeCompare(b[0]));

      // Create full list strings
      const allLines: string[] = [];
      itemList.forEach(([name, qty]) => allLines.push(`${qty < 10 ? '0'+qty : qty}x ${name}`));
      
      if (identityList.length > 0) {
          allLines.push(""); // Spacer
          allLines.push("IDENTIDADE VISUAL (Inclusa):");
          identityList.forEach(([name, qty]) => allLines.push(`${qty < 10 ? '0'+qty : qty}x ${name}`));
      }

      // Split into 2 columns
      const half = Math.ceil(allLines.length / 2);
      const col1 = allLines.slice(0, half).join('\n');
      const col2 = allLines.slice(half).join('\n');

      // Add Headers "Mobiliário e Equipamentos" (Right Side)
      addText(slideId, "Mobiliário, Equipamentos e Identidade", 310, 100, 380, 20, 12, GREEN, true);

      // Add Columns Text (Small Font 6pt)
      const col1Id = addText(slideId, col1, 310, 125, 190, 250, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: col1Id, style: { lineSpacing: 115 }, fields: 'lineSpacing' } });

      const col2Id = addText(slideId, col2, 510, 125, 190, 250, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: col2Id, style: { lineSpacing: 115 }, fields: 'lineSpacing' } });
  });

  // REMOVE BLANK FIRST SLIDE
  // We added `addSlide` for everything, so slide index 0 (default) is pushed to start.
  // Actually, `createSlide` adds NEW slides. The default one stays at index 0 unless we move or delete it.
  // If `defaultSlideId` was found, we delete it.
  if (defaultSlideId) {
      requests.push({
          deleteObject: { objectId: defaultSlideId }
      });
  }

  // 2. Execute Batch Update
  if (requests.length > 0) {
      const batchRes = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      
      if (!batchRes.ok) {
          const batchError = await batchRes.json();
          console.error('Batch Update Error Details:', JSON.stringify(batchError, null, 2));
          alert(`Erro ao preencher slides: ${batchError.error?.message || 'Verifique o console'}`);
      }
  }

  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
};
