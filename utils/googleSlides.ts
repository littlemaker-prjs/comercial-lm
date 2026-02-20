
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
    // Google Slides API cannot access localhost.
    // If running locally, use a placeholder.
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn("Google Slides API cannot access localhost images. Using placeholder for Logo.");
        return "https://placehold.co/200x60/transparent/71477A.png?text=LITTLE+MAKER";
    }
    // In production, assume 'logo_lm.png' is in 'public/images/' folder
    return `${window.location.origin}/images/logo_lm.png`;
};

export const createGoogleSlidePresentation = async (
  accessToken: string,
  appState: AppState,
  calculations: any
) => {
  const { client, commercial } = appState;
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
  if (!presentationId) {
      throw new Error("ID da apresentação não retornado pela API.");
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
    
    // 1. Create Shape
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

    // 2. Insert Text
    requests.push({
      insertText: {
        objectId: elementId,
        text: text,
        insertionIndex: 0
      }
    });

    // 3. Style Text
    requests.push({
      updateTextStyle: {
        objectId: elementId,
        style: {
          fontFamily: 'Montserrat',
          fontSize: { magnitude: fontSize, unit: 'PT' },
          foregroundColor: { opaqueColor: { rgbColor: color } },
          bold: bold
        },
        fields: 'foregroundColor,bold,fontFamily,fontSize' // IMPORTANT: fields is a sibling of style
      }
    });

    // 4. Align Paragraph
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

  // Logo
  addImage(coverId, LOGO_URL, 20, 10, 100, 30);

  // Title
  addText(coverId, "Proposta Comercial", 0, 150, 720, 50, 32, PURPLE, true, 'CENTER');
  addText(coverId, client.schoolName || 'Escola', 0, 210, 720, 40, 24, GRAY, false, 'CENTER');
  
  const dateStr = new Date(client.date).toLocaleDateString('pt-BR');
  addText(coverId, `A/C: ${client.contactName} • ${dateStr}`, 0, 260, 720, 30, 14, GRAY, false, 'CENTER');

  // Bottom Bar
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


  // --- SLIDE 2: VALORES ---
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
        // IMPORTANT: pageObjectId MUST be inside elementProperties for createTable
        elementProperties: {
            pageObjectId: valuesId,
            transform: { scaleX: 1, scaleY: 1, translateX: 30, translateY: 120, unit: 'PT' },
            // FIX: Height is required by API even if autosizing.
            size: { width: { magnitude: 300, unit: 'PT' }, height: { magnitude: 100, unit: 'PT' } }
        },
        rows: 4, 
        columns: 2
    }
  });

  // Fill Table 1 Text
  const matData = [
      ["Material do Aluno", ""],
      ["Total de Alunos", calculations.totalStudents.toString()],
      ["Investimento Aluno/Ano", (calculations.totalMaterialYear / calculations.totalStudents).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })],
      ["Investimento Aluno/Mês", (calculations.totalMaterialYear / calculations.totalStudents / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]
  ];

  // Helper for table cell text
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
              fields: 'foregroundColor,bold,fontFamily,fontSize' // IMPORTANT: fields outside style
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

  // Header Style
  insertCellText(tableId1, 0, 0, "Material do Aluno", 11, true, WHITE, 'CENTER');
  requests.push({ mergeTableCells: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 } } });
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } } }, fields: 'tableCellBackgroundFill' } });

  // Rows
  insertCellText(tableId1, 1, 0, "Total de Alunos");
  insertCellText(tableId1, 1, 1, matData[1][1], 10, true, BLACK, 'END');
  
  insertCellText(tableId1, 2, 0, "Investimento Aluno/Ano");
  insertCellText(tableId1, 2, 1, matData[2][1], 10, true, BLACK, 'END');

  insertCellText(tableId1, 3, 0, "Investimento Aluno/Mês", 11, true);
  insertCellText(tableId1, 3, 1, matData[3][1], 12, true, BLACK, 'END');
  requests.push({ updateTableCellProperties: { objectId: tableId1, tableRange: { location: { rowIndex: 3, columnIndex: 0 }, rowSpan: 1, columnSpan: 2 }, tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } } }, fields: 'tableCellBackgroundFill' } });


  // --- TABLE 2: INFRA (If exists) ---
  if (calculations.totalInfra > 0) {
    const tableId2 = `table_infra_${Date.now()}`;
    requests.push({
        createTable: {
            objectId: tableId2,
            elementProperties: {
                pageObjectId: valuesId,
                transform: { scaleX: 1, scaleY: 1, translateX: 370, translateY: 120, unit: 'PT' },
                // FIX: Added Height
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

  // Bottom Bar Values
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


  // --- SLIDES 3+: TECH SPECS ---
  // Helper for Spec Slide
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
      // Filter items
      const items = appState.selectedInfraIds.filter(id => {
          const infraItem = INFRA_CATALOG.find(i => i.id === id);
          return infraItem && infraItem.category === cat;
      });

      if (items.length === 0) return;

      const catTitle = cat === 'maker' ? 'Espaço Maker' : cat === 'midia' ? 'Sala de Mídia' : 'Espaço Infantil';
      const slideId = addSpecSlide(cat, catTitle);

      // Aggregate Items
      const aggregatedRegular: Record<string, number> = {};
      items.forEach(id => {
          const details = INFRA_DETAILS[id];
          if (details) {
              details.items.forEach(item => {
                  const key = item.name.trim();
                  aggregatedRegular[key] = (aggregatedRegular[key] || 0) + item.qty;
              });
          }
      });

      const itemList = Object.entries(aggregatedRegular).sort((a, b) => a[0].localeCompare(b[0]));
      
      // Add List
      let yPos = 120;
      addText(slideId, "Mobiliário e Equipamentos", 30, yPos, 400, 20, 12, GREEN, true);
      yPos += 25;

      // Simple Text List
      const listText = itemList.map(([name, qty]) => `${qty < 10 ? '0'+qty : qty}x  ${name}`).join('\n');
      
      const listId = addText(slideId, listText, 30, yPos, 400, 230, 9, GRAY);
      
      requests.push({
          updateParagraphStyle: {
              objectId: listId,
              style: { lineSpacing: 130 },
              fields: 'lineSpacing'
          }
      });

      // Add Image on Right
      let imgUrl = "";
      if (cat === 'maker') {
        if (appState.selectedInfraIds.includes('maker_minima')) imgUrl = AMBIENTATION_IMAGES['maker_minima'];
        else imgUrl = AMBIENTATION_IMAGES['maker_padrao'];
      } else if (cat === 'midia') {
        imgUrl = AMBIENTATION_IMAGES['midia_padrao'];
      } else if (cat === 'infantil') {
        if (appState.selectedInfraIds.includes('infantil_carrinho')) imgUrl = AMBIENTATION_IMAGES['infantil_carrinho'];
        else imgUrl = AMBIENTATION_IMAGES['infantil_oficina'];
      }

      if (imgUrl) {
          addImage(slideId, imgUrl, 450, 120, 240, 180);
      }
  });

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
