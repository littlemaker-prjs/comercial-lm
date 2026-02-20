
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
    return "https://comercial-lm.vercel.app/images/logo_lm.png";
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

          // Title (Size 11)
          addText(scopeId, content.title, xPos, yPos, colWidth, 30, 11, GREEN, true);
          
          // Subtitle (Size 9, Bold)
          addText(scopeId, content.subtitle, xPos, yPos + 25, colWidth, 20, 9, GRAY, true); 

          // Items (Size 9, Increased Spacing)
          const listText = content.items.map((it: string) => `• ${it}`).join('\n');
          const listId = addText(scopeId, listText, xPos, yPos + 55, colWidth, 300, 9, BLACK); // Increased Y offset
          requests.push({
            updateParagraphStyle: {
                objectId: listId,
                style: { lineSpacing: 140 }, // Increased line spacing
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

  // --- TABLE 1: MATERIAL (Using Shapes for rounded look) ---
  const table1X = 30;
  const table1Y = 80;
  const table1W = 320;
  
  // Header Shape
  const t1HeaderId = `t1_head_${Date.now()}`;
  requests.push({
      createShape: {
          objectId: t1HeaderId,
          shapeType: 'ROUND_RECTANGLE', // Rounded corners
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: table1W, unit: 'PT' }, height: { magnitude: 30, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: table1X, translateY: table1Y, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: t1HeaderId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
  addText(valuesId, "Material do Aluno", table1X, table1Y + 5, table1W, 20, 12, WHITE, true, 'CENTER');

  // Body Shape (White background with border)
  const t1BodyId = `t1_body_${Date.now()}`;
  const t1BodyH = 100;
  requests.push({
      createShape: {
          objectId: t1BodyId,
          shapeType: 'RECTANGLE',
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: table1W, unit: 'PT' }, height: { magnitude: t1BodyH, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: table1X, translateY: table1Y + 25, unit: 'PT' } // Overlap slightly to look connected
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: t1BodyId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { solidFill: {color: {rgbColor: GRAY_LIGHT}}, weight: {magnitude: 1, unit: 'PT'} } }, fields: 'shapeBackgroundFill,outline' } });

  // Content Rows
  const matRows = [
      { label: "Total de Alunos", value: calculations.totalStudents.toString(), highlight: false },
      { label: "Investimento Aluno/Ano *", value: calculations.appliedRatePerStudentYear.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), highlight: false },
      { label: "Investimento Aluno/Mês *", value: calculations.finalMaterialRatePerMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), highlight: true },
      { label: "Bônus Fidelidade (Desc.)", value: calculations.materialDiscountAmount > 0 ? `- ${calculations.materialDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : "-", highlight: false, isBonus: true }
  ];

  let currentY = table1Y + 35;
  matRows.forEach((row, idx) => {
      const labelColor = row.isBonus ? GRAY : BLACK;
      const valColor = row.isBonus ? GREEN : BLACK;
      const fontSize = row.highlight ? 10 : 9;
      const valFontSize = row.highlight ? 11 : 10;
      const isBold = true;

      if (row.highlight) {
           // Highlight Background
           const hlId = `hl_mat_${idx}_${Date.now()}`;
           requests.push({
                createShape: {
                    objectId: hlId,
                    shapeType: 'RECTANGLE',
                    elementProperties: {
                        pageObjectId: valuesId,
                        size: { width: { magnitude: table1W, unit: 'PT' }, height: { magnitude: 20, unit: 'PT' } },
                        transform: { scaleX: 1, scaleY: 1, translateX: table1X, translateY: currentY, unit: 'PT' }
                    }
                }
           });
           requests.push({ updateShapeProperties: { objectId: hlId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
      }

      addText(valuesId, row.label, table1X + 10, currentY, 200, 20, fontSize, labelColor, isBold);
      addText(valuesId, row.value, table1X + 210, currentY, 100, 20, valFontSize, valColor, true, 'END');
      
      currentY += 22;
  });


  // --- TABLE 2: INFRA (Using Shapes) ---
  if (calculations.hasInfraItems) {
    const table2X = 370;
    const table2Y = 80;
    const table2W = 320;

    // Header Shape
    const t2HeaderId = `t2_head_${Date.now()}`;
    requests.push({
        createShape: {
            objectId: t2HeaderId,
            shapeType: 'ROUND_RECTANGLE',
            elementProperties: {
                pageObjectId: valuesId,
                size: { width: { magnitude: table2W, unit: 'PT' }, height: { magnitude: 30, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: table2X, translateY: table2Y, unit: 'PT' }
            }
        }
    });
    requests.push({ updateShapeProperties: { objectId: t2HeaderId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
    addText(valuesId, "Infraestrutura (Ambientação e Ferramentas)", table2X, table2Y + 5, table2W, 20, 12, WHITE, true, 'CENTER');

    // Body Shape
    const t2BodyId = `t2_body_${Date.now()}`;
    const t2BodyH = 100; // Adjusted height
    requests.push({
        createShape: {
            objectId: t2BodyId,
            shapeType: 'RECTANGLE',
            elementProperties: {
                pageObjectId: valuesId,
                size: { width: { magnitude: table2W, unit: 'PT' }, height: { magnitude: t2BodyH, unit: 'PT' } },
                transform: { scaleX: 1, scaleY: 1, translateX: table2X, translateY: table2Y + 25, unit: 'PT' }
            }
        }
    });
    requests.push({ updateShapeProperties: { objectId: t2BodyId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { solidFill: {color: {rgbColor: GRAY_LIGHT}}, weight: {magnitude: 1, unit: 'PT'} } }, fields: 'shapeBackgroundFill,outline' } });

    const infraRows = [
        { label: "Investimento Infraestrutura ***", value: calculations.totalInfra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), highlight: false },
        { label: "Desconto bônus fidelidade **", value: calculations.infraDiscountAmount > 0 ? `- ${calculations.infraDiscountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : "-", highlight: false, isBonus: true },
        { label: "Total Final (Único)", value: calculations.totalInfraNet.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), highlight: true },
        { label: "Parcelamento (3x)", value: calculations.infraInstallment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), highlight: true }
    ];

    let currentY2 = table2Y + 35;
    infraRows.forEach((row, idx) => {
        const labelColor = row.isBonus ? GRAY : BLACK;
        const valColor = row.isBonus ? GREEN : BLACK;
        const fontSize = row.highlight ? 10 : 9;
        const valFontSize = row.highlight ? 11 : 10;
        const isBold = true;

        if (row.highlight) {
             // Highlight Background
             const hlId = `hl_infra_${idx}_${Date.now()}`;
             requests.push({
                  createShape: {
                      objectId: hlId,
                      shapeType: 'RECTANGLE',
                      elementProperties: {
                          pageObjectId: valuesId,
                          size: { width: { magnitude: table2W, unit: 'PT' }, height: { magnitude: 20, unit: 'PT' } },
                          transform: { scaleX: 1, scaleY: 1, translateX: table2X, translateY: currentY2, unit: 'PT' }
                      }
                  }
             });
             requests.push({ updateShapeProperties: { objectId: hlId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
        }

        addText(valuesId, row.label, table2X + 10, currentY2, 200, 20, fontSize, labelColor, isBold);
        addText(valuesId, row.value, table2X + 210, currentY2, 100, 20, valFontSize, valColor, true, 'END');
        
        currentY2 += 22;
    });
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
      
      // Title in Header (Matching Scope Slide Title)
      addText(slideId, title, 140, 10, 560, 30, 24, WHITE, true, 'END');

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

      // Get Title from Scope Logic to match exactly
      const textData = getProposalText(cat as CategoryType, selectedInfraIds, calculations);
      const catTitle = textData ? textData.title : (cat === 'maker' ? 'Espaço Maker' : cat === 'midia' ? 'Sala de Mídia' : 'Espaço Infantil');

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

      // ADD IMAGE (LEFT SIDE - 45% Width)
      // Slide width 720. 45% is ~324pt.
      // Image x=20, y=70.
      if (imgUrl) {
          addImage(slideId, imgUrl, 20, 70, 324, 250);
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
      // X starts after image + padding. 20 + 324 + 20 = 364.
      // Width = 720 - 364 - 20 = 336.
      const rightX = 364;
      const rightW = 336;
      
      // Add Header "Memorial Descritivo Detalhado" (Right Side)
      // Positioned close to header bar (y=60)
      addText(slideId, "Memorial Descritivo Detalhado", rightX, 60, rightW, 20, 12, GREEN, true);

      // Split into 2 columns for the list
      const half = Math.ceil(allLines.length / 2);
      const col1 = allLines.slice(0, half).join('\n');
      const col2 = allLines.slice(half).join('\n');
      
      const colW = (rightW / 2) - 10;

      // Add Columns Text (Small Font 6pt)
      const col1Id = addText(slideId, col1, rightX, 85, colW, 290, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: col1Id, style: { lineSpacing: 115 }, fields: 'lineSpacing' } });

      const col2Id = addText(slideId, col2, rightX + colW + 10, 85, colW, 290, 6, GRAY);
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
