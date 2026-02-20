
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
      
      // Title in Header
      addText(scopeId, "Escopo do Projeto", 140, 10, 560, 30, 24, WHITE, true, 'END');

      // Columns Calculation
      const colCount = scopeContents.length;
      const margin = 30;
      const availableWidth = 720 - (margin * 2);
      const gutter = 30; // Increased gutter
      const colWidth = (availableWidth - (gutter * (colCount - 1))) / colCount;

      scopeContents.forEach((content, idx) => {
          const xPos = margin + (idx * (colWidth + gutter));
          const yPos = 80; // Moved up slightly

          // Title
          addText(scopeId, content.title, xPos, yPos, colWidth, 30, 14, GREEN, true);
          
          // Subtitle
          addText(scopeId, content.subtitle, xPos, yPos + 25, colWidth, 20, 10, GRAY, true); 

          // Items
          const listText = content.items.map((it: string) => `• ${it}`).join('\n');
          const listId = addText(scopeId, listText, xPos, yPos + 50, colWidth, 300, 10, BLACK);
          requests.push({
            updateParagraphStyle: {
                objectId: listId,
                style: { lineSpacing: 130 },
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

  // Title in Header
  addText(valuesId, "Condições Comerciais", 140, 10, 560, 30, 24, WHITE, true, 'END');

  // --- TABLE 1: MATERIAL ---
  const tableId1 = `table_mat_${Date.now()}`;
  requests.push({
    createTable: {
        objectId: tableId1,
        elementProperties: {
            pageObjectId: valuesId,
            transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 80, unit: 'PT' },
            size: { width: { magnitude: 320, unit: 'PT' }, height: { magnitude: 120, unit: 'PT' } }
        },
        rows: 5, // Added row for Bonus
        columns: 2
    }
  });

  const matData = [
      ["Material do Aluno", ""],
      ["Total de Alunos", calculations.totalStudents.toString()],
      ["Investimento Aluno/Ano *", calculations.appliedRatePerStudentYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ["Investimento Aluno/Mês *", calculations.finalMaterialRatePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ["Bônus Fidelidade (Desc.)", calculations.materialDiscountAmount > 0 ? `- ${calculations.materialDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : "-"]
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

  insertCellText(tableId1, 0, 0, "Material do Aluno", 12, true, WHITE, 'CENTER');
  requests.push({ mergeTableCells: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 } } });
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } } }, fields: 'tableCellBackgroundFill' } });

  insertCellText(tableId1, 1, 0, "Total de Alunos");
  insertCellText(tableId1, 1, 1, matData[1][1], 10, true, BLACK, 'END');
  
  insertCellText(tableId1, 2, 0, "Investimento Aluno/Ano *");
  insertCellText(tableId1, 2, 1, matData[2][1], 10, true, BLACK, 'END');
  
  insertCellText(tableId1, 3, 0, "Investimento Aluno/Mês *", 11, true);
  insertCellText(tableId1, 3, 1, matData[3][1], 12, true, BLACK, 'END');
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 3, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } } }, fields: 'tableCellBackgroundFill' } });

  if (calculations.materialDiscountAmount > 0) {
      insertCellText(tableId1, 4, 0, "Bônus Fidelidade (Desc.)", 10, false, GRAY);
      insertCellText(tableId1, 4, 1, matData[4][1], 10, true, GREEN, 'END');
  } else {
      insertCellText(tableId1, 4, 0, "-", 10, false, GRAY);
      insertCellText(tableId1, 4, 1, "-", 10, true, GRAY, 'END');
  }


  // --- TABLE 2: INFRA ---
  if (calculations.hasInfraItems) {
    const tableId2 = `table_infra_${Date.now()}`;
    requests.push({
        createTable: {
            objectId: tableId2,
            elementProperties: {
                pageObjectId: valuesId,
                transform: { scaleX: 1, scaleY: 1, translateX: 370, translateY: 80, unit: 'PT' },
                size: { width: { magnitude: 320, unit: 'PT' }, height: { magnitude: 120, unit: 'PT' } }
            },
            rows: 4, 
            columns: 2
        }
    });
    const infraData = [
        ["Infraestrutura", ""],
        ["Investimento Infraestrutura ***", calculations.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ["Desconto bônus fidelidade **", calculations.infraDiscountAmount > 0 ? `- ${calculations.infraDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : "-"],
        ["Total Final (Único)", calculations.totalInfraNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
        ["Parcelamento (3x)", calculations.infraInstallment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
    ];
    
    insertCellText(tableId2, 0, 0, "Infraestrutura (Ambientação e Ferramentas)", 12, true, WHITE, 'CENTER');
    requests.push({ mergeTableCells: { objectId: tableId2, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 } } });
    requests.push({ updateTableCellProperties: { objectId: tableId2, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } } }, fields: 'tableCellBackgroundFill' } });

    insertCellText(tableId2, 1, 0, "Investimento Infraestrutura ***");
    insertCellText(tableId2, 1, 1, infraData[1][1], 10, true, BLACK, 'END');

    if (calculations.infraDiscountAmount > 0) {
        insertCellText(tableId2, 2, 0, "Desconto bônus fidelidade **");
        insertCellText(tableId2, 2, 1, infraData[2][1], 10, true, GREEN, 'END');
    } else {
        insertCellText(tableId2, 2, 0, "-");
        insertCellText(tableId2, 2, 1, "-", 10, true, GRAY, 'END');
    }

    insertCellText(tableId2, 3, 0, "Total Final (Único)", 11, true);
    insertCellText(tableId2, 3, 1, infraData[3][1], 12, true, BLACK, 'END');
    // insertCellText(tableId2, 4, 0, "Parcelamento (3x)", 11, true);
    // insertCellText(tableId2, 4, 1, infraData[4][1], 12, true, BLACK, 'END');
    
    // Highlight Total Final
    // requests.push({ updateTableCellProperties: { objectId: tableId2, tableRange: { location: { rowIndex: 3, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } } }, fields: 'tableCellBackgroundFill' } });
    
    // Add background for parcelamento (Add BEFORE text to ensure it's behind)
    const parcelamentoBgId = `rect_parc_${Date.now()}`;
    requests.push({
        createShape: {
            objectId: parcelamentoBgId,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: valuesId,
                size: { width: { magnitude: 320, unit: 'PT' }, height: { magnitude: 30, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: 370, translateY: 210, unit: 'PT' }
            }
        }
    });
    requests.push({ updateShapeProperties: { objectId: parcelamentoBgId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

    // Add Parcelamento text (Add AFTER background)
    addText(valuesId, "Parcelamento em 3x", 370, 210, 160, 30, 11, BLACK, true, 'START');
    addText(valuesId, infraData[4][1], 530, 210, 160, 30, 12, BLACK, true, 'END');
  }

  // Footnotes
  const footnotesY = 260;
  const footnotes = [];
  
  if (calculations.commercial.contractDuration === 3) {
      footnotes.push("* Desconto para contrato de 3 anos aplicado no valor do material do aluno ao longo de todo o contrato.");
  }
  if (calculations.commercial.useMarketplace) {
      footnotes.push("* Margem operacional do parceiro de market place inclusa no valor.");
  }
  if (calculations.commercial.applyInfraBonus && calculations.hasInfraItems) {
      footnotes.push("** Desconto para contrato de 3 anos aplicado no valor da infraestrutura. É necessário comprovar quantitativo de aluno atual equivalente à proposta.");
  }
  if (calculations.hasInfraItems) {
      footnotes.push("*** Região de entrega considerada: " + (appState.regionId || 'Padrão'));
  }
  footnotes.push("Proposta válida por 30 dias a partir da data de emissão.");

  addText(valuesId, footnotes.join('\n'), 30, footnotesY, 660, 100, 8, GRAY);


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
      
      // Title in Header
      addText(slideId, `Memorial Descritivo - ${title}`, 140, 10, 560, 30, 24, WHITE, true, 'END');

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

      // ADD IMAGE (LEFT SIDE - MAXIMIZED)
      // Slide width 720. Height available ~340 (50 to 390).
      // Image x=20, y=70. Width 450. Height 300.
      if (imgUrl) {
          addImage(slideId, imgUrl, 20, 70, 450, 300);
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

      // Right Side Column
      // x = 490, width = 210.
      
      // Add Header "Memorial Descritivo Detalhado" (Right Side)
      addText(slideId, "Memorial Descritivo Detalhado", 490, 70, 210, 20, 12, GREEN, true);

      // Add Columns Text (Small Font 6pt)
      // Since width is narrow, we might need single column or very tight double column.
      // Let's try single column for the list on the right, as space is limited.
      const listText = allLines.join('\n');
      const listId = addText(slideId, listText, 490, 95, 210, 280, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: listId, style: { lineSpacing: 115 }, fields: 'lineSpacing' } });
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
