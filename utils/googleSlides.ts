
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
    // Using a public placeholder service that is guaranteed to be accessible by Google
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
        if (selectedIds.includes('infantil_ferr_up_12')) toolCap += 12;
    }

    const num = furnitureCap || 0;
    const numf = toolCap || 0;
    
    const replacePlaceholders = (text: string) => text.replace(/{{num}}/g, num.toString()).replace(/{{numf}}/g, numf.toString());

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

  const addText = (pageId: string, text: string, x: number, y: number, w: number, h: number, fontSize: number, color: any = BLACK, bold = false, align = 'START', verticalAlign = 'TOP') => {
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
    requests.push({
        updateShapeProperties: {
            objectId: elementId,
            shapeProperties: {
                contentAlignment: verticalAlign
            },
            fields: 'contentAlignment'
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
    return elementId;
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
  
  // Cover Content
  addText(coverId, client.schoolName || 'Escola', 0, 150, 720, 50, 32, PURPLE, true, 'CENTER');
  addText(coverId, `A/C: ${client.contactName}`, 0, 210, 720, 30, 18, GRAY, false, 'CENTER');
  
  const dateStr = new Date(client.date).toLocaleDateString('pt-BR');
  const consultantName = client.consultantName || "Consultor";
  addText(coverId, `Proposta gerada por ${consultantName} em ${dateStr}`, 0, 260, 720, 30, 14, GRAY, false, 'CENTER');
  addText(coverId, "Proposta válida por 30 dias a partir da data de emissão.", 0, 290, 720, 30, 12, GRAY, false, 'CENTER');

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


  // --- SLIDE 2: INFRAESTRUTURA PROPOSTA (NOVO) ---
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

  // Always create the slide
  const scopeId = addSlide();
  
  // Header Bar Reuse
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
  addText(scopeId, "Infraestrutura Proposta", 140, 15, 560, 20, 18, WHITE, true, 'END', 'MIDDLE');

  if (scopeContents.length > 0) {
      // Columns Configuration
      const gutter = 12;
      const colWidth = 212;
      const cardY = 96;
      const cardHeight = 236;
      const headerHeight = 45;

      // Dynamic Centering Logic
      const numCols = scopeContents.length;
      const totalContentWidth = (numCols * colWidth) + ((numCols - 1) * gutter);
      const pageWidth = 720;
      const startX = (pageWidth - totalContentWidth) / 2;

      scopeContents.forEach((content, idx) => {
          const xPos = startX + (idx * (colWidth + gutter));
          
          // --- Card Body (Gray) ---
          // Goal: Straight Top, Rounded Bottom (Small Radius 20pt)
          
          const radiusSize = 20;
          const bodyMainHeight = cardHeight - radiusSize; 
          
          // 1. Bottom Round Rect (Gray) - The "Cap"
          const bodyBottomId = `body_bottom_${scopeId}_${idx}`;
          
          const bodyCapHeight = 40; // Height to generate the radius
          const bodyCapY = cardY + cardHeight - bodyCapHeight;
          
          requests.push({
              createShape: {
                  objectId: bodyBottomId,
                  shapeType: 'ROUND_RECTANGLE',
                  elementProperties: {
                      pageObjectId: scopeId,
                      size: { width: { magnitude: colWidth, unit: 'PT' }, height: { magnitude: bodyCapHeight, unit: 'PT' } },
                      transform: { scaleX: 1, scaleY: 1, translateX: xPos, translateY: bodyCapY, unit: 'PT' }
                  }
              }
          });
          requests.push({ updateShapeProperties: { objectId: bodyBottomId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

          // 2. Main Rectangle (Gray) - Covers top of bottom round rect
          // It needs to go down to (cardY + cardHeight - bodyCapHeight/2) to cover the top corners of the round rect.
          const bodyMainId = `body_main_${scopeId}_${idx}`;
          requests.push({
              createShape: {
                  objectId: bodyMainId,
                  shapeType: 'RECTANGLE',
                  elementProperties: {
                      pageObjectId: scopeId,
                      size: { width: { magnitude: colWidth, unit: 'PT' }, height: { magnitude: cardHeight - (bodyCapHeight / 2), unit: 'PT' } },
                      transform: { scaleX: 1, scaleY: 1, translateX: xPos, translateY: cardY, unit: 'PT' }
                  }
              }
          });
          requests.push({ updateShapeProperties: { objectId: bodyMainId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });


          // --- Card Header (Green) ---
          // Goal: Rounded Top, Straight Bottom
          
          const headerCapHeight = 40;
          
          // 1. Top Round Rect (Green)
          const headerRoundId = `header_round_${scopeId}_${idx}`;
          requests.push({
              createShape: {
                  objectId: headerRoundId,
                  shapeType: 'ROUND_RECTANGLE',
                  elementProperties: {
                      pageObjectId: scopeId,
                      size: { width: { magnitude: colWidth, unit: 'PT' }, height: { magnitude: headerCapHeight, unit: 'PT' } },
                      transform: { scaleX: 1, scaleY: 1, translateX: xPos, translateY: cardY, unit: 'PT' }
                  }
              }
          });
          requests.push({ updateShapeProperties: { objectId: headerRoundId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

          // 2. Bottom Rectangle (Green) - Covers bottom rounded corners of the header cap
          // Starts at cardY + (headerCapHeight / 2)
          // Height = headerHeight - (headerCapHeight / 2)
          const headerStraightId = `header_straight_${scopeId}_${idx}`;
          requests.push({
              createShape: {
                  objectId: headerStraightId,
                  shapeType: 'RECTANGLE',
                  elementProperties: {
                      pageObjectId: scopeId,
                      size: { width: { magnitude: colWidth, unit: 'PT' }, height: { magnitude: headerHeight - (headerCapHeight / 2), unit: 'PT' } },
                      transform: { scaleX: 1, scaleY: 1, translateX: xPos, translateY: cardY + (headerCapHeight / 2), unit: 'PT' }
                  }
              }
          });
          requests.push({ updateShapeProperties: { objectId: headerStraightId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });


          // 3. Header Title
          addText(scopeId, content.title, xPos + 5, cardY + 5, colWidth - 10, headerHeight - 10, 10, WHITE, true, 'CENTER', 'MIDDLE');
          
          // 4. Subtitle (Below Header) - With Green Background
          // "colada na verde do título" -> Start at cardY + headerHeight
          const subtitleY = cardY + headerHeight;
          const subtitleH = 40; // "um pouco mais alta"
          
          // Background for Subtitle
          const subBgId = `sub_bg_${scopeId}_${idx}`;
          requests.push({
              createShape: {
                  objectId: subBgId,
                  shapeType: 'RECTANGLE',
                  elementProperties: {
                      pageObjectId: scopeId,
                      size: { width: { magnitude: colWidth, unit: 'PT' }, height: { magnitude: subtitleH, unit: 'PT' } },
                      transform: { scaleX: 1, scaleY: 1, translateX: xPos, translateY: subtitleY, unit: 'PT' }
                  }
              }
          });
          // Light Green: {red: 0.92, green: 0.96, blue: 0.88}
          requests.push({ updateShapeProperties: { objectId: subBgId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

          addText(scopeId, content.subtitle, xPos + 10, subtitleY, colWidth - 20, subtitleH, 9, GRAY, true, 'CENTER', 'MIDDLE'); 

          // 5. Items (List)
          const listText = content.items.map((it: string) => `• ${it}`).join('\n');
          const listId = addText(scopeId, listText, xPos + 10, cardY + headerHeight + subtitleH + 10, colWidth - 20, cardHeight - headerHeight - subtitleH - 20, 8, BLACK);
          requests.push({
            updateParagraphStyle: {
                objectId: listId,
                style: { lineSpacing: 115 }, 
                fields: 'lineSpacing'
            }
          });
      });
  } else {
      // Empty State Message
      addText(scopeId, "Nenhuma infraestrutura será fornecida nesta proposta.", 60, 180, 600, 40, 16, BLACK, true, 'CENTER', 'MIDDLE');
  }

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
  addText(valuesId, "Condições Comerciais", 140, 15, 560, 20, 18, WHITE, true, 'END', 'MIDDLE');

  // Subtitle Logic
  let subtitleText = "";
  const comm = calculations.commercial;
  if (comm.contractDuration === 1) {
      subtitleText = "Contrato de 1 ano";
  } else if (comm.contractDuration === 3) {
      if (!comm.useMarketplace) {
          subtitleText = "Contrato de 3 anos com bônus no Material do Aluno";
      } else {
          if (comm.applyInfraBonus) {
              subtitleText = "Contrato de 3 anos com bônus na Infraestrutura e venda pelo Marketplace";
          } else {
              subtitleText = "Contrato de 3 anos com bônus no Material do Aluno e venda pelo Marketplace";
          }
      }
  }
  
  // Add Subtitle (More spacing)
  addText(valuesId, subtitleText, 40, 70, 640, 30, 14, GREEN, true, 'CENTER', 'MIDDLE');

  // Data Preparation
  const totalStudents = calculations.totalStudents;
  const materialYear = calculations.finalMaterialRatePerYear; // Use final rate (discounted)
  const materialMonth = calculations.finalMaterialRatePerMonth;
  const infraTotal = calculations.totalInfra;
  const bonus = calculations.infraDiscountAmount;
  const infraFinal = calculations.totalInfraNet;
  const parcelas = calculations.infraInstallment;

  // Dynamic Asterisk Logic (Replicated from ProposalView)
  const showMaterialNote = comm.useMarketplace || (comm.contractDuration === 3 && !comm.applyInfraBonus);
  const showInfraBonusNote = comm.contractDuration === 3 && comm.applyInfraBonus && calculations.hasInfraItems && comm.useMarketplace;
  const showRegionNote = calculations.hasInfraItems;

  let symbolCounter = 1;
  const getNextSymbol = () => '*'.repeat(symbolCounter++);

  const materialSymbol = showMaterialNote ? getNextSymbol() : '';
  const regionSymbol = showRegionNote ? getNextSymbol() : '';
  const infraBonusSymbol = showInfraBonusNote ? getNextSymbol() : '';

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // --- LEFT TABLE (Material) ---
  // If no infra, center this table.
  // Standard Left X = 40. Center X = (720 - 300) / 2 = 210.
  const leftW = 300;
  const leftX = calculations.hasInfraItems ? 40 : 210;
  const leftY = 110; // Moved down further
  const headerH = 20;
  const rowH = 25;
  
  // Composite Header (Green) - Rounded Top, Straight Bottom
  const leftHeaderRoundId = `left_header_round_${valuesId}`;
  requests.push({
      createShape: {
          objectId: leftHeaderRoundId,
          shapeType: 'ROUND_RECTANGLE',
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: leftW, unit: 'PT' }, height: { magnitude: 40, unit: 'PT' } }, // Height 40 for radius 20
              transform: { scaleX: 1, scaleY: 1, translateX: leftX, translateY: leftY, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: leftHeaderRoundId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

  const leftHeaderStraightId = `left_header_straight_${valuesId}`;
  requests.push({
      createShape: {
          objectId: leftHeaderStraightId,
          shapeType: 'RECTANGLE',
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: leftW, unit: 'PT' }, height: { magnitude: 10, unit: 'PT' } }, // Cover bottom half (10pt)
              transform: { scaleX: 1, scaleY: 1, translateX: leftX, translateY: leftY + 10, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: leftHeaderStraightId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

  addText(valuesId, "Material do Aluno", leftX, leftY, leftW, headerH, 10, WHITE, true, 'CENTER', 'MIDDLE');

  // Composite Body (Gray) - Straight Top, Rounded Bottom
  // Rows: Total, Inv/Ano, Inv/Mês. (3 rows * 25 = 75pt).
  const leftBodyH = 75;
  const leftBodyY = leftY + headerH;
  
  // 1. Bottom Round Rect (Gray)
  const leftBodyBottomId = `left_body_bottom_${valuesId}`;
  const leftBodyCapH = 20;
  requests.push({
      createShape: {
          objectId: leftBodyBottomId,
          shapeType: 'ROUND_RECTANGLE',
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: leftW, unit: 'PT' }, height: { magnitude: leftBodyCapH, unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: leftX, translateY: leftBodyY + leftBodyH - leftBodyCapH, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: leftBodyBottomId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

  // 2. Main Rect (Gray) - Covers top
  const leftBodyMainId = `left_body_main_${valuesId}`;
  requests.push({
      createShape: {
          objectId: leftBodyMainId,
          shapeType: 'RECTANGLE',
          elementProperties: {
              pageObjectId: valuesId,
              size: { width: { magnitude: leftW, unit: 'PT' }, height: { magnitude: leftBodyH - (leftBodyCapH / 2), unit: 'PT' } },
              transform: { scaleX: 1, scaleY: 1, translateX: leftX, translateY: leftBodyY, unit: 'PT' }
          }
      }
  });
  requests.push({ updateShapeProperties: { objectId: leftBodyMainId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

  // Rows
  const leftRows = [
      { label: "Total de Alunos", value: totalStudents.toString(), bold: false, color: BLACK },
      { label: `Investimento Aluno/Ano ${materialSymbol}`, value: formatCurrency(materialYear), bold: false, color: BLACK },
      { label: `Investimento Aluno/Mês ${materialSymbol}`, value: formatCurrency(materialMonth), bold: true, highlight: true, color: BLACK }
  ];

  leftRows.forEach((row, idx) => {
      const y = leftBodyY + (idx * rowH);
      if (row.highlight) {
         const hlId = `hl_left_${valuesId}_${idx}`;
         requests.push({
            createShape: {
                objectId: hlId,
                shapeType: 'RECTANGLE',
                elementProperties: {
                    pageObjectId: valuesId,
                    size: { width: { magnitude: leftW, unit: 'PT' }, height: { magnitude: rowH, unit: 'PT' } }, // Full width
                    transform: { scaleX: 1, scaleY: 1, translateX: leftX, translateY: y, unit: 'PT' }
                }
            }
         });
         // Light Green Background
         requests.push({ updateShapeProperties: { objectId: hlId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
      }
      addText(valuesId, row.label, leftX + 10, y, leftW / 2, rowH, 9, BLACK, row.bold, 'START', 'MIDDLE');
      addText(valuesId, row.value, leftX + (leftW / 2), y, (leftW / 2) - 10, rowH, row.highlight ? 11 : 10, row.color || BLACK, row.bold, 'END', 'MIDDLE');
  });
  
  // Bonus Outside (Conditional)
  if (calculations.materialDiscountAmount > 0) {
      const bonusY = leftBodyY + leftBodyH + 5;
      const bonusRow = { label: calculations.materialBonusText, value: "- " + formatCurrency(calculations.materialDiscountAmount), bold: false, color: GREEN };
      addText(valuesId, bonusRow.label, leftX + 10, bonusY, leftW / 2, rowH, 9, BLACK, false, 'START', 'MIDDLE');
      addText(valuesId, bonusRow.value, leftX + (leftW / 2), bonusY, (leftW / 2) - 10, rowH, 10, GREEN, false, 'END', 'MIDDLE');
  }


  // --- RIGHT TABLE (Infra) ---
  if (calculations.hasInfraItems) {
      const rightX = 370;
      const rightY = 110; // Moved down further
      const rightW = 320;
      
      // Composite Header (Green)
      const rightHeaderRoundId = `right_header_round_${valuesId}`;
      requests.push({
          createShape: {
              objectId: rightHeaderRoundId,
              shapeType: 'ROUND_RECTANGLE',
              elementProperties: {
                  pageObjectId: valuesId,
                  size: { width: { magnitude: rightW, unit: 'PT' }, height: { magnitude: 40, unit: 'PT' } },
                  transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: rightY, unit: 'PT' }
              }
          }
      });
      requests.push({ updateShapeProperties: { objectId: rightHeaderRoundId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

      const rightHeaderStraightId = `right_header_straight_${valuesId}`;
      requests.push({
          createShape: {
              objectId: rightHeaderStraightId,
              shapeType: 'RECTANGLE',
              elementProperties: {
                  pageObjectId: valuesId,
                  size: { width: { magnitude: rightW, unit: 'PT' }, height: { magnitude: 10, unit: 'PT' } },
                  transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: rightY + 10, unit: 'PT' }
              }
          }
      });
      requests.push({ updateShapeProperties: { objectId: rightHeaderStraightId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: GREEN } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

      addText(valuesId, "Infraestrutura (Ambientação e Ferramentas)", rightX, rightY, rightW, 20, 10, WHITE, true, 'CENTER', 'MIDDLE');

      // Rows
      interface RowItem {
          label: string;
          value: string;
          bold: boolean;
          color: any;
          highlight?: boolean;
      }
      
      // Determine asterisks for Infra
      // Use dynamic symbols
      
      const rightRows: RowItem[] = [
          { label: `Investimento Infraestrutura ${regionSymbol}`, value: formatCurrency(infraTotal), bold: false, color: BLACK }
      ];
      
      if (bonus > 0) {
          rightRows.push({ label: `${calculations.infraBonusText} ${infraBonusSymbol}`, value: "- " + formatCurrency(bonus), bold: false, color: GREEN });
      }
      
      rightRows.push({ label: "Total Final (Único)", value: formatCurrency(infraFinal), bold: true, color: BLACK });
      rightRows.push({ label: "Parcelamento (3x)", value: formatCurrency(parcelas), bold: true, highlight: true, color: BLACK });

      // Composite Body (Gray)
      // Rows: Inv Infra, [Desc Bonus], Total, Parcelamento. 
      const rightBodyH = rightRows.length * 25;
      const rightBodyY = rightY + 20;

      // 1. Bottom Round Rect
      const rightBodyBottomId = `right_body_bottom_${valuesId}`;
      const rightBodyCapH = 20;
      requests.push({
          createShape: {
              objectId: rightBodyBottomId,
              shapeType: 'ROUND_RECTANGLE',
              elementProperties: {
                  pageObjectId: valuesId,
                  size: { width: { magnitude: rightW, unit: 'PT' }, height: { magnitude: rightBodyCapH, unit: 'PT' } },
                  transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: rightBodyY + rightBodyH - rightBodyCapH, unit: 'PT' }
              }
          }
      });
      requests.push({ updateShapeProperties: { objectId: rightBodyBottomId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

      // 2. Main Rect
      const rightBodyMainId = `right_body_main_${valuesId}`;
      requests.push({
          createShape: {
              objectId: rightBodyMainId,
              shapeType: 'RECTANGLE',
              elementProperties: {
                  pageObjectId: valuesId,
                  size: { width: { magnitude: rightW, unit: 'PT' }, height: { magnitude: rightBodyH - (rightBodyCapH / 2), unit: 'PT' } },
                  transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: rightBodyY, unit: 'PT' }
              }
          }
      });
      requests.push({ updateShapeProperties: { objectId: rightBodyMainId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.95, green: 0.95, blue: 0.95} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });

      rightRows.forEach((row, idx) => {
          const y = rightBodyY + (idx * 25);
          if (row.highlight) {
             const hlId = `hl_right_${valuesId}_${idx}`;
             requests.push({
                createShape: {
                    objectId: hlId,
                    shapeType: 'RECTANGLE',
                    elementProperties: {
                        pageObjectId: valuesId,
                        size: { width: { magnitude: rightW, unit: 'PT' }, height: { magnitude: 25, unit: 'PT' } },
                        transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: y, unit: 'PT' }
                    }
                }
             });
             // Light Green Background
             requests.push({ updateShapeProperties: { objectId: hlId, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: {red: 0.92, green: 0.96, blue: 0.88} } } }, outline: { propertyState: 'NOT_RENDERED' } }, fields: 'shapeBackgroundFill,outline' } });
          }
          addText(valuesId, row.label, rightX + 10, y, rightW / 2 + 20, 25, 9, BLACK, row.bold, 'START', 'MIDDLE');
          addText(valuesId, row.value, rightX + (rightW / 2) + 20, y, (rightW / 2) - 30, 25, row.highlight ? 11 : 10, row.color || BLACK, row.bold, 'END', 'MIDDLE');
      });
  }

  // Footnotes
  const footnotes = [];
  
  if (showMaterialNote) {
      let text = "";
      if (comm.useMarketplace && (comm.contractDuration === 3 && !comm.applyInfraBonus)) {
          text = "Margem operacional do parceiro de market place inclusa e desconto para contrato de 3 anos aplicado no valor.";
      } else if (comm.useMarketplace) {
          text = "Margem operacional do parceiro de market place inclusa no valor.";
      } else {
          text = "Desconto para contrato de 3 anos aplicado no valor do material do aluno ao longo de todo o contrato.";
      }
      footnotes.push(`${materialSymbol} ${text}`);
  }

  if (showRegionNote) {
      footnotes.push(`${regionSymbol} Região de entrega considerada: ${appState.regionId || 'Padrão'}`);
  }

  if (showInfraBonusNote) {
      footnotes.push(`${infraBonusSymbol} Desconto para contrato de 3 anos aplicado no valor da infraestrutura. É necessário comprovar quantitativo de aluno atual equivalente à proposta.`);
  }
  
  // Removed "Proposta válida..." from here as it moved to cover

  addText(valuesId, footnotes.join('\n'), 40, 280, 640, 100, 8, GRAY);

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
      addImage(slideId, LOGO_URL, 20, 10, 100, 30); // Adjusted Logo to fit smaller header
      
      // Title in Header (Matching Scope Slide Title)
      addText(slideId, title, 140, 15, 560, 20, 18, WHITE, true, 'END', 'MIDDLE');

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

      // ADD IMAGE (LEFT SIDE - Adjusted based on print)
      // Square 11.5cm x 11.5cm = 326pt x 326pt
      const imgSize = 326;
      const imgX = 20;
      const imgY = 60;
      
      if (imgUrl) {
          // Use a square placeholder to force the shape to be square
          // Then replace with the real image using CENTER_CROP to fill the square
          const placeholderUrl = "https://dummyimage.com/400x400/cccccc/cccccc";
          const imgId = addImage(slideId, placeholderUrl, imgX, imgY, imgSize, imgSize);
          
          if (imgId) {
              requests.push({
                  replaceImage: {
                      imageObjectId: imgId,
                      imageReplaceMethod: 'CENTER_CROP',
                      url: imgUrl
                  }
              });
          }
      }

      // Right Side Column
      // Image ends at 20+326 = 346. 
      // Gap = 14pt -> Start at 360.
      const rightX = 360;
      const rightW = 340; // Available width
      
      // Add Header "Memorial Descritivo Detalhado" (Right Side)
      // Centered over the text area. Y=60 (Aligned with Image Top)
      // "um pouco mais para baixo" -> Y=60
      addText(slideId, "Memorial Descritivo Detalhado", rightX, imgY, rightW, 20, 10, GREEN, true, 'CENTER', 'MIDDLE');

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

      // Split into 2 columns for the list
      const half = Math.ceil(allLines.length / 2);
      const col1Lines = allLines.slice(0, half).join('\n');
      const col2Lines = allLines.slice(half).join('\n');
      
      // Columns Positions
      // Width 6.2cm = 176pt
      const colW = 176;
      const col1X = 360; 
      const col2X = 360 + colW + 10; // 546
      const textY = 85; // Below Subtitle (60 + 20 + 5)

      // Add Columns Text (Small Font 6pt, line spacing 1.0)
      const col1Id = addText(slideId, col1Lines, col1X, textY, colW, 300, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: col1Id, style: { lineSpacing: 100 }, fields: 'lineSpacing' } });

      const col2Id = addText(slideId, col2Lines, col2X, textY, colW, 300, 6, GRAY);
      requests.push({ updateParagraphStyle: { objectId: col2Id, style: { lineSpacing: 100 }, fields: 'lineSpacing' } });
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