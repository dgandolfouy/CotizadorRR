
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Quote, QuoteStatus, UserRole, ToolingCost, InventoryItem } from '../types';
import StatusBadge from './StatusBadge';
import { ArrowLeftIcon, XIcon, DownloadIcon, TrashIcon, EditIcon, PaperclipIcon, PlusIcon, ExclamationIcon } from './IconComponents';
import ConfirmationModal from './ConfirmationModal';
import type { QuoteOutletContext } from './Dashboard';
import { generateQuotePDF } from '../services/pdfService';
import useSystemData from '../hooks/useSystemData';
import useInventory from '../hooks/useInventory';
import { TOOLING_PRICES_DEFAULT, PRICING_UNIT_OPTIONS } from '../constants';

const ImageModal: React.FC<{ src: string; alt: string; isOpen: boolean; onClose: () => void }> = ({ src, alt, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="relative max-w-4xl w-full max-h-[90vh]">
                <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300">
                    <XIcon className="h-8 w-8" />
                </button>
                <img src={src} alt={alt} className="w-full h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
    );
}

const QuoteDetail: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { quotes, updateQuote, user } = useOutletContext<QuoteOutletContext>();
  const { users, dieCuts } = useSystemData();
  
  const { inventory, calculateLinearMeters, inventoryStatus } = useInventory(quotes);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [editingPrices, setEditingPrices] = useState<{ [itemId: string]: { [qtyId: string]: string } }>({});
  const [editingDiscounts, setEditingDiscounts] = useState<{ [itemId: string]: { [qtyId: string]: string } }>({});
  
  const [selectedCoils, setSelectedCoils] = useState<{ [itemId: string]: string }>({});
  const [selectedLaminates, setSelectedLaminates] = useState<{ [itemId: string]: string }>({});
  const [productionTracks, setProductionTracks] = useState<{ [itemId: string]: number }>({});
  const [pricingUnits, setPricingUnits] = useState<{ [itemId: string]: 'Unidad' | 'Millar' | 'Pack' }>({});
  
  const [toolingCosts, setToolingCosts] = useState<ToolingCost[]>([]);
  const [generalNotes, setGeneralNotes] = useState(''); // Notas Cotizador
  const [preprensaNotes, setPreprensaNotes] = useState(''); // Notas Preprensa
  const [expeditionNotes, setExpeditionNotes] = useState(''); // Notas Expedición
  const [alertExpedition, setAlertExpedition] = useState(false);

  const [exchangeRate, setExchangeRate] = useState<number>(0);

  const [rejectionReason, setRejectionReason] = useState('');
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSaveQuoteModal, setShowSaveQuoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Estados para filtros inteligentes de bobina
  const [showAllCoils, setShowAllCoils] = useState<{ [itemId: string]: boolean }>({});

  const isOwner = quote?.vendedorId === user.id;
  const isCotizadorUser = user.role === UserRole.Cotizador;
  const isAdmin = user.role === UserRole.Admin;
  const isDirector = user.role === UserRole.Director;

  const canEditPrices = useMemo(() => {
      if (!quote) return false;
      // Allow Cotizador, Admin AND Director
      if (user.role !== UserRole.Cotizador && user.role !== UserRole.Admin && user.role !== UserRole.Director) return false;
      if (quote.estado === QuoteStatus.Pendiente) return true;
      if (quote.estado === QuoteStatus.Cotizado) return true;
      return false;
  }, [quote, user.role]);

  const canReactivate = useMemo(() => {
      if (!quote) return false;
      const allowedStatus = [QuoteStatus.Abandonada, QuoteStatus.RechazadoCotizador, QuoteStatus.Rechazado];
      return allowedStatus.includes(quote.estado) && (isCotizadorUser || isAdmin || isDirector);
  }, [quote, isCotizadorUser, isAdmin, isDirector]);

  // --- AUTOMATIZACIÓN DE COSTOS DE HERRAMENTAL (Al Cargar) ---
  useEffect(() => {
      if (quote && canEditPrices) {
          // Solo autogenerar si la lista está vacía y es la primera carga (o si se desea recalcular)
          if ((!quote.costosHerramental || quote.costosHerramental.length === 0) && toolingCosts.length === 0) {
              const autoCosts: ToolingCost[] = [];
              let totalClises = 0;
              let hasNewDie = false;
              let hasSerigraphy = false;
              let hasHotStamping = false;

              quote.items.forEach(item => {
                  // Clisés: Sumar tintas
                  if (item.tintas && Number(item.tintas) > 0) {
                      totalClises += Number(item.tintas);
                  }
                  // REGLA: Si hay Barniz Sectorizado, se cobra como un clisé más
                  if (item.barniz?.tipo === 'Sectorizado') {
                      totalClises += 1;
                  }

                  // Troquel Nuevo
                  if (item.troquelEstado === 'Nuevo') {
                      hasNewDie = true;
                  }
                  // Terminaciones
                  if (item.terminacionesEspeciales) {
                      if (item.terminacionesEspeciales.some(t => t.toLowerCase().includes('serigrafía'))) hasSerigraphy = true;
                      if (item.terminacionesEspeciales.some(t => t.toLowerCase().includes('hot stamping'))) hasHotStamping = true;
                  }
              });

              if (totalClises > 0) {
                  autoCosts.push({
                      id: `auto-clise-${Date.now()}`,
                      tipo: 'Clisé',
                      cantidad: totalClises,
                      precioUnitario: TOOLING_PRICES_DEFAULT['Clisé'],
                      esSinCargo: false,
                      descuento: 0
                  });
              }
              if (hasNewDie) {
                  autoCosts.push({
                      id: `auto-die-${Date.now()}`,
                      tipo: 'Troquel',
                      cantidad: 1,
                      precioUnitario: TOOLING_PRICES_DEFAULT['Troquel'],
                      esSinCargo: false,
                      descuento: 0
                  });
              }
              if (hasSerigraphy) {
                  autoCosts.push({
                      id: `auto-seri-${Date.now()}`,
                      tipo: 'Matriz Serigrafía',
                      cantidad: 1,
                      precioUnitario: TOOLING_PRICES_DEFAULT['Matriz Serigrafía'],
                      esSinCargo: false,
                      descuento: 0
                  });
              }
              if (hasHotStamping) {
                  autoCosts.push({
                      id: `auto-hot-${Date.now()}`,
                      tipo: 'Cuño Hot Stamping',
                      cantidad: 1,
                      precioUnitario: TOOLING_PRICES_DEFAULT['Cuño Hot Stamping'],
                      esSinCargo: false,
                      descuento: 0
                  });
              }

              if (autoCosts.length > 0) {
                  setToolingCosts(autoCosts);
              }
          }
      }
  }, [quote, canEditPrices]);

  useEffect(() => {
    const foundQuote = quotes.find(q => q.id === quoteId);
    if (foundQuote) {
      setQuote(foundQuote);
      setGeneralNotes(foundQuote.notasCotizador || '');
      setPreprensaNotes(foundQuote.notasParaPreprensa || ''); 
      setExpeditionNotes(foundQuote.notaExpedicion || '');
      setAlertExpedition(foundQuote.alertarExpedicion || false);
      setExchangeRate(foundQuote.tipoCambio || 42.5); 
      
      if (foundQuote.costosHerramental && foundQuote.costosHerramental.length > 0) {
          setToolingCosts(foundQuote.costosHerramental);
      }
      
      if (canEditPrices) {
          const initialPrices: any = {};
          const initialDiscounts: any = {};
          const initialCoils: any = {};
          const initialLaminates: any = {};
          const initialTracks: any = {};
          const initialUnits: any = {};

          foundQuote.items.forEach(item => {
              initialPrices[item.id] = {};
              initialDiscounts[item.id] = {};
              
              item.quantities.forEach(q => {
                  if (q.precioCotizado !== undefined) {
                      const total = q.precioCotizado * (Number(q.cantidad) || 0);
                      initialPrices[item.id][q.id] = String(total);
                  }
                  if (q.descuento !== undefined) initialDiscounts[item.id][q.id] = String(q.descuento);
              });
              
              if (item.selectedMaterialId) initialCoils[item.id] = item.selectedMaterialId;
              if (item.selectedLaminateId) initialLaminates[item.id] = item.selectedLaminateId;
              initialTracks[item.id] = item.produccionCarreras || item.troquelCarreras || 1;
              initialUnits[item.id] = item.pricingUnit || 'Millar';
          });
          setEditingPrices(initialPrices);
          setEditingDiscounts(initialDiscounts);
          setSelectedCoils(initialCoils);
          setSelectedLaminates(initialLaminates);
          setProductionTracks(initialTracks);
          setPricingUnits(initialUnits);
      }
    }
  }, [quoteId, quotes, user.role, canEditPrices]);

  if (!quote) {
    return <div className="p-10 text-center text-gray-500 dark:text-gray-400 text-2xl font-medium">Cargando cotización...</div>;
  }

  const handlePriceChange = (itemId: string, qtyId: string, value: string) => {
      setEditingPrices(prev => ({ ...prev, [itemId]: { ...prev[itemId], [qtyId]: value } }));
  };

  const handleDiscountChange = (itemId: string, qtyId: string, value: string) => {
      setEditingDiscounts(prev => ({ ...prev, [itemId]: { ...prev[itemId], [qtyId]: value } }));
  };

  const calculateTotal = () => {
      let total = 0;
      quote.items.forEach(item => {
          const itemPrices = editingPrices[item.id] || {};
          const itemDiscounts = editingDiscounts[item.id] || {};
          const firstQtyId = item.quantities[0]?.id;
          if (firstQtyId && itemPrices[firstQtyId]) {
              const totalBase = parseFloat(itemPrices[firstQtyId]) || 0;
              const discount = parseFloat(itemDiscounts[firstQtyId]) || 0;
              const finalTotal = totalBase * (1 - (discount / 100));
              total += finalTotal;
          }
      });
      toolingCosts.forEach(tool => {
          if (!tool.esSinCargo) {
              const base = tool.cantidad * tool.precioUnitario;
              const discount = tool.descuento || 0;
              total += base * (1 - discount/100);
          }
      });
      return total;
  };

  const handleSaveQuote = async () => {
      if (!quote) return;
      setErrorMsg(null);
      
      const updatedItems = quote.items.map(item => {
          const tracks = productionTracks[item.id] || Number(item.troquelCarreras) || 1;
          const maxQty = Math.max(...item.quantities.map(q => Number(q.cantidad)));
          const consumedMeters = calculateLinearMeters(Number(item.largo), maxQty, tracks);

          return {
            ...item,
            selectedMaterialId: selectedCoils[item.id] || item.selectedMaterialId,
            selectedLaminateId: selectedLaminates[item.id] || item.selectedLaminateId,
            produccionCarreras: tracks,
            consumoLinealEstimado: consumedMeters,
            pricingUnit: pricingUnits[item.id] || 'Millar',
            quantities: item.quantities.map(q => {
                const totalPrice = parseFloat(editingPrices[item.id]?.[q.id] || '0');
                const qtyVal = Number(q.cantidad) || 1;
                const unitPrice = totalPrice / qtyVal;

                return {
                    ...q,
                    precioCotizado: unitPrice,
                    descuento: parseFloat(editingDiscounts[item.id]?.[q.id] || '0')
                };
            })
          }
      });

      const updatedQuote: Quote = {
          ...quote,
          items: updatedItems,
          costosHerramental: toolingCosts,
          tipoCambio: exchangeRate,
          notasCotizador: generalNotes,
          notasParaPreprensa: preprensaNotes,
          notaExpedicion: expeditionNotes,
          alertarExpedicion: alertExpedition,
          importeTotal: calculateTotal(),
          fechaCotizacion: new Date().toISOString(),
          estado: QuoteStatus.Cotizado
      };

      await updateQuote(updatedQuote);
      setShowSaveQuoteModal(false);
      navigate('/');
  };

  const addToolingCost = () => {
      setToolingCosts([...toolingCosts, {
          id: `tool-${Date.now()}`,
          tipo: 'Otro',
          cantidad: 1,
          precioUnitario: 0,
          esSinCargo: false,
          descuento: 0
      }]);
  };
  const updateTooling = (id: string, field: keyof ToolingCost, value: any) => {
      setToolingCosts(toolingCosts.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const removeTooling = (id: string) => setToolingCosts(toolingCosts.filter(t => t.id !== id));

  const handleApprove = async () => {
      if (!quote) return;
      await updateQuote({ 
          ...quote, 
          estado: QuoteStatus.Aprobado, 
          notasParaPreprensa: preprensaNotes,
          notaExpedicion: expeditionNotes,
          alertarExpedicion: alertExpedition
      });
      setShowApproveModal(false);
      navigate('/');
  };

  const handleReject = async () => {
      if (!quote) return;
      // Director también rechaza como técnico (mismo estado que Cotizador para permitir re-edición fácil)
      const newStatus = (user.role === UserRole.Cotizador || user.role === UserRole.Director) ? QuoteStatus.RechazadoCotizador : QuoteStatus.Rechazado;         
      await updateQuote({ ...quote, estado: newStatus, motivoRechazo: rejectionReason });
      setShowRejectModal(false);
      navigate('/');
  };
  
  const handleReactivate = async () => {
      if(!quote) return;
      await updateQuote({ ...quote, estado: QuoteStatus.Pendiente, motivoRechazo: undefined });
      setShowReactivateModal(false);
      navigate('/');
  };
  
  const handleDeleteQuote = async () => {
      if (!quote) return;
      await updateQuote({ ...quote, estado: QuoteStatus.Eliminado, motivoRechazo: 'Eliminado por el usuario' });
      setShowDeleteModal(false);
      navigate('/');
  };
  
  // Función para enviar mail directo a expedición
  const sendExpeditionMail = () => {
      if (!quote) return;
      const subject = encodeURIComponent(`Alerta Expedición - Cotización #${quote.id} - ${quote.cliente}`);
      const body = encodeURIComponent(`Atención Expedición,\n\nSe requiere seguimiento para la siguiente orden aprobada:\n\nCliente: ${quote.cliente}\nCotización: #${quote.id}\n\nNOTA DE EXPEDICIÓN:\n${expeditionNotes}\n\nSaludos,\n${user.nombre}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };
  
  const handleEditRequest = () => navigate(`/edit/${quote.id}`);
  const handleDownloadPDF = () => { if (quote) generateQuotePDF(quote, user, users); };

  const canApproveReject = user.role === UserRole.AsistenteComercial && quote.estado === QuoteStatus.Cotizado;
  const canDownloadPDF = (quote.estado === QuoteStatus.Cotizado || quote.estado === QuoteStatus.Aprobado);
  const canDelete = isOwner && quote.estado === QuoteStatus.Pendiente;
  const canEditRequest = isOwner && quote.estado === QuoteStatus.Pendiente;

  const currencySymbol = quote.moneda === 'USD' ? 'U$S' : '$';

  return (
    <div className="bg-white dark:bg-gray-800 min-h-full pb-10">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
             <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={() => navigate('/')} className="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors flex-shrink-0">
                    <ArrowLeftIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight truncate flex-grow">{quote.id}</h1>
                <div className="flex-shrink-0">
                    <StatusBadge status={quote.estado} />
                </div>
            </div>
             <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                <span className="text-sm sm:text-lg text-gray-500 dark:text-gray-400">Fecha: <span className="font-bold text-gray-900 dark:text-white">{new Date(quote.fechaSolicitud).toLocaleDateString()}</span></span>
                {canEditRequest && (
                    <button onClick={handleEditRequest} className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors font-medium text-sm w-full sm:w-auto">
                        <EditIcon className="h-5 w-5 mr-2" /> Editar Solicitud
                    </button>
                )}
                {canReactivate && (
                    <button onClick={() => setShowReactivateModal(true)} className="flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors font-medium text-sm w-full sm:w-auto">
                        Reactivar Cotización
                    </button>
                )}
                {canDownloadPDF && (
                    <button onClick={handleDownloadPDF} className="flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-sm transition-colors font-medium text-sm w-full sm:w-auto">
                        <DownloadIcon className="h-5 w-5 mr-2" /> Descargar PDF
                    </button>
                )}
                {canDelete && (
                     <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-red-600 dark:text-red-400 rounded-md shadow-sm transition-colors font-medium text-sm border border-gray-300 dark:border-gray-600 w-full sm:w-auto">
                        <TrashIcon className="h-5 w-5 mr-2" /> Eliminar Solicitud
                    </button>
                )}
            </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mt-2 break-words">{quote.cliente}</h2>
        {errorMsg && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md font-bold">{errorMsg}</div>}
    
        {quote.estado === QuoteStatus.Abandonada && (
            <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 rounded font-bold">
                Esta cotización ha sido marcada como ABANDONADA por inactividad. El stock reservado ha sido liberado. Solo un Cotizador o Admin puede reactivarla.
            </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* TABLA PRINCIPAL DE ITEMS */}
        {quote.items.map((item, index) => {
             const isPrinter = item.tipoTrabajo === 'Venta de Impresora/Hardware';
             const isRibbonSale = item.tipoTrabajo === 'Venta de Insumos (Ribbon)';
             
             const saleType = item.tipoProducto || 'Etiquetas';
             let badgeColor = "bg-orange-100 text-orange-800 border-orange-200";
             if (saleType === 'Unidad (Rollo)') badgeColor = "bg-blue-100 text-blue-800 border-blue-200";
             if (saleType === 'Servicio') badgeColor = "bg-purple-100 text-purple-800 border-purple-200";
             if (saleType === 'Unidad' || saleType.includes('Impresora') || isPrinter) badgeColor = "bg-gray-100 text-gray-800 border-gray-200";

             // LOGICA DE FILTRADO INTELIGENTE DE BOBINA
             const materialCode = item.material?.match(/\((.*?)\)/)?.[1] || ''; // Extraer código ej: 017
             const filteredCoils = inventory.filter(i => i.tipo === 'Sustrato' && (showAllCoils[item.id] || (materialCode ? i.codigo.startsWith(materialCode.substring(0,3)) : true)));
             
             // LOGICA FILTRADO DE LAMINADOS
             const laminateCoils = inventory.filter(i => i.tipo === 'Laminado');

             // LOGICA DE VALIDACIÓN DE ANCHO Y CONSUMO
             const selectedCoilItem = inventory.find(i => i.id === selectedCoils[item.id]);
             const selectedLamItem = inventory.find(i => i.id === selectedLaminates[item.id]);
             
             const tracks = productionTracks[item.id] || Number(item.troquelCarreras) || 1;
             const requiredWidth = ((Number(item.ancho) + 3) * tracks) + 10;
             const isWidthAlert = selectedCoilItem && selectedCoilItem.ancho < requiredWidth;
             const isLamWidthAlert = selectedLamItem && selectedLamItem.ancho < requiredWidth;

             const dieInfo = dieCuts.find(d => d.id === item.troquelId);
             const isTrackAlert = dieInfo && dieInfo.carreras !== tracks;

             return (
                 <article key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                     {/* Header del Item */}
                     <div className="bg-orange-50 dark:bg-orange-900/20 px-4 sm:px-6 py-4 border-b border-orange-100 dark:border-orange-900/30 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Ítem #{index + 1}</span>
                            <h4 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{item.tipoTrabajo}</h4>
                        </div>
                        {item.referencia && <div className="text-lg sm:text-xl font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm self-start sm:self-auto">{item.referencia}</div>}
                    </div>
                    
                    <div className="p-4 sm:p-6">
                        {/* PANEL DE PRODUCCIÓN Y STOCK (VISIBLE PARA COTIZADOR Y DIRECTOR) */}
                        {canEditPrices && !isPrinter && !isRibbonSale && (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                                <h5 className="font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">P</span>
                                    Definición Técnica de Producción
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* SELECCIÓN DE BOBINA PAPEL */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                                                Seleccionar Bobina (Sustrato) <span className="text-red-500">*</span>
                                            </label>
                                            <button 
                                                type="button" 
                                                onClick={() => setShowAllCoils(prev => ({...prev, [item.id]: !prev[item.id]}))}
                                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                            >
                                                {showAllCoils[item.id] ? 'Filtrar sugeridos' : 'Mostrar todas'}
                                            </button>
                                        </div>
                                        <select 
                                            value={selectedCoils[item.id] || ''}
                                            onChange={(e) => setSelectedCoils(prev => ({...prev, [item.id]: e.target.value}))}
                                            className={`w-full p-2 text-sm border rounded bg-white dark:bg-gray-700 ${isWidthAlert ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 dark:border-gray-600'}`}
                                        >
                                            <option value="">-- Seleccione Ancho para {materialCode || item.material} --</option>
                                            {filteredCoils.map(mat => {
                                                const status = inventoryStatus[mat.id];
                                                return (
                                                    <option key={mat.id} value={mat.id}>
                                                        {mat.ancho} mm {showAllCoils[item.id] ? `(${mat.nombre})` : ''} - Disp: {status.disponible.toLocaleString()}m
                                                    </option>
                                                )
                                            })}
                                        </select>
                                        
                                        {/* ALERTA ANCHO */}
                                        {isWidthAlert && (
                                            <div className="mt-1 text-xs text-red-600 font-bold flex items-center gap-1">
                                                <ExclamationIcon className="h-4 w-4" />
                                                Ancho insuficiente. Requerido: {requiredWidth}mm
                                            </div>
                                        )}
                                        {selectedCoils[item.id] && inventoryStatus[selectedCoils[item.id]] && (
                                            <div className="mt-1 text-xs text-gray-500">
                                                <span className="font-bold">Stock Físico:</span> {inventoryStatus[selectedCoils[item.id]].fisico.toLocaleString()}m
                                            </div>
                                        )}
                                    </div>

                                    {/* SELECCIÓN DE LAMINADO (CONDICIONAL) */}
                                    {item.laminado && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">
                                                Seleccionar Bobina (Laminado) <span className="text-red-500">*</span>
                                            </label>
                                            <select 
                                                value={selectedLaminates[item.id] || ''}
                                                onChange={(e) => setSelectedLaminates(prev => ({...prev, [item.id]: e.target.value}))}
                                                className={`w-full p-2 text-sm border rounded bg-white dark:bg-gray-700 ${isLamWidthAlert ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 dark:border-gray-600'}`}
                                            >
                                                <option value="">-- Seleccione Laminado {item.laminado} --</option>
                                                {laminateCoils.filter(l => l.nombre.toLowerCase().includes(item.laminado!.toLowerCase())).map(lam => {
                                                    const status = inventoryStatus[lam.id];
                                                    return (
                                                        <option key={lam.id} value={lam.id}>
                                                            {lam.ancho} mm ({lam.nombre}) - Disp: {status.disponible.toLocaleString()}m
                                                        </option>
                                                    )
                                                })}
                                            </select>
                                            {isLamWidthAlert && (
                                                <div className="mt-1 text-xs text-red-600 font-bold flex items-center gap-1">
                                                    <ExclamationIcon className="h-4 w-4" />
                                                    Ancho Laminado insuficiente.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ANCHO Y TROQUEL */}
                                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase mb-1">
                                                Bandas de Producción <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    type="number" 
                                                    value={productionTracks[item.id] || 1}
                                                    onChange={e => setProductionTracks(prev => ({...prev, [item.id]: parseInt(e.target.value)}))}
                                                    className={`w-full p-2 border rounded text-sm ${isTrackAlert ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'border-gray-300 dark:bg-gray-700'}`}
                                                    placeholder="1"
                                                    min="1"
                                                />
                                            </div>
                                            
                                            {isTrackAlert && (
                                                <div className="mt-1 text-xs text-red-600 font-bold flex items-center gap-1">
                                                    <ExclamationIcon className="h-4 w-4" />
                                                    Troquel es de {dieInfo.carreras} carreras.
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 flex items-center">
                                            <div>
                                                <span className="font-bold block mb-1">Cálculo de Ancho Sugerido:</span>
                                                ({item.ancho}mm + 3mm calle) x {tracks} bandas + 10mm = <span className="font-bold text-gray-900 dark:text-white">{requiredWidth}mm</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DETALLES DE VENTA (READ-ONLY PARA COTIZADOR) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-sm text-gray-700 dark:text-gray-300">
                             <div>
                                 <span className="font-bold block text-xs text-gray-500 uppercase">Material Solicitado:</span>
                                 <span className="text-lg">
                                     <span className="bg-orange-100 text-orange-800 px-2 rounded font-mono text-base mr-2">{materialCode}</span>
                                     {item.material}
                                 </span>
                             </div>
                             <div>
                                 <span className="font-bold block text-xs text-gray-500 uppercase">Especificaciones:</span>
                                 {item.ancho}x{item.largo}mm | {item.tintas} Tintas | {item.tipoTroquel}
                             </div>
                             <div>
                                 <span className="font-bold block text-xs text-gray-500 uppercase">Presentación:</span>
                                 {item.tipoProducto} | {item.cantidadEtiquetasPorRollo} u/rollo | Buje {item.buje}
                             </div>
                             <div>
                                 <span className="font-bold block text-xs text-gray-500 uppercase">Terminaciones:</span>
                                 {item.laminado && <span className="mr-2">Lam: {item.laminado}</span>}
                                 {item.barniz && <span className="mr-2">Barniz: {item.barniz.tipo}</span>}
                                 {item.impresoDorso && <span className="text-red-500 font-bold">DORSO</span>}
                             </div>
                        </div>

                        {/* ADJUNTOS */}
                        {item.adjuntos && item.adjuntos.length > 0 && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-600">
                                <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <PaperclipIcon className="h-4 w-4" /> Archivos Adjuntos / Arte
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {item.adjuntos.map((att) => (
                                        <a 
                                            key={att.id}
                                            href={att.fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[150px]">{att.fileName}</span>
                                            <DownloadIcon className="h-4 w-4 text-gray-500" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TABLA DE PRECIOS MEJORADA */}
                        <div className="mt-6 sm:mt-8 bg-gray-50 dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
                             <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold px-3 py-1 rounded border uppercase ${badgeColor}`}>
                                        Venta por: {saleType}
                                    </span>
                                </div>
                                {canEditPrices && (
                                    <select 
                                        value={pricingUnits[item.id] || 'Millar'} 
                                        onChange={(e) => setPricingUnits(prev => ({...prev, [item.id]: e.target.value as any}))}
                                        className="text-xs p-1 border rounded bg-white dark:bg-gray-700"
                                    >
                                        {PRICING_UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                                {item.quantities.map(qty => {
                                    const unitLabel = item.tipoProducto === 'Unidad (Rollo)' ? 'Rollos' : item.tipoProducto === 'Juegos' ? 'Juegos' : (item.tipoProducto === 'Servicio' || item.tipoProducto === 'Unidad') ? 'Unid.' : 'Etiquetas';
                                    const cantidad = qty.cantidad as number;
                                    
                                    const currentTotalStr = editingPrices[item.id]?.[qty.id] || (qty.precioCotizado ? String(qty.precioCotizado * cantidad) : '');
                                    const currentDiscountStr = editingDiscounts[item.id]?.[qty.id] || (qty.descuento ? String(qty.descuento) : '');
                                    const totalVal = parseFloat(currentTotalStr) || 0;
                                    const discVal = parseFloat(currentDiscountStr) || 0;
                                    const totalFinal = totalVal * (1 - discVal/100);

                                    return (
                                        <div key={qty.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex flex-col justify-between">
                                            <div>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mb-1">
                                                    CANTIDAD
                                                </span>
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                                    {cantidad.toLocaleString()} {unitLabel}
                                                </span>
                                                {canEditPrices && (
                                                    <span className="block text-xs text-blue-600 font-medium mt-1">
                                                        {calculateLinearMeters(Number(item.largo), cantidad, productionTracks[item.id] || 1).toFixed(0)} metros lineales
                                                    </span>
                                                )}
                                            </div>

                                            {canEditPrices && !isPrinter ? (
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                                                                Precio x {pricingUnits[item.id] || 'Millar'}
                                                            </label>
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-bold z-10">{currencySymbol}</span>
                                                                <input 
                                                                    type="number" 
                                                                    step="0.01"
                                                                    value={currentTotalStr}
                                                                    onChange={(e) => handlePriceChange(item.id, qty.id, e.target.value)}
                                                                    className="w-full pl-8 pr-2 py-2 text-lg font-bold border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="w-20">
                                                            <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                                                                Dto %
                                                            </label>
                                                            <input 
                                                                type="number" 
                                                                min="0" max="100"
                                                                value={currentDiscountStr}
                                                                onChange={(e) => handleDiscountChange(item.id, qty.id, e.target.value)}
                                                                className="w-full mt-0 p-2 py-2 text-lg font-bold border border-gray-300 dark:border-gray-600 rounded text-center dark:bg-gray-700 dark:text-white focus:ring-orange-500"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-end text-right border-t border-gray-100 dark:border-gray-700 pt-2">
                                                        <span className="text-xs text-gray-400">Total Final</span>
                                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{currencySymbol}{totalFinal.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <p className="text-xs text-gray-500 uppercase">Lista</p>
                                                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                                {currencySymbol} {(qty.precioCotizado! * cantidad).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                            </p>
                                                        </div>
                                                        {qty.descuento && qty.descuento > 0 && (
                                                            <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                                                                -{qty.descuento}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                 </article>
             )
        })}

        {/* SECCIÓN DE COSTOS DE HERRAMENTAL (CLISÉS, TROQUELES) */}
        {(canEditPrices || toolingCosts.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Costos de Matrices y Servicios Extras
                </h3>
                <div className="space-y-4">
                    {toolingCosts.map(tool => (
                        <div key={tool.id} className="grid grid-cols-12 gap-2 items-end bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                            <div className="col-span-12 sm:col-span-4">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ítem</label>
                                {canEditPrices ? (
                                    <select value={tool.tipo} onChange={(e) => updateTooling(tool.id, 'tipo', e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white">
                                        {Object.keys(TOOLING_PRICES_DEFAULT).map(k => <option key={k} value={k}>{k}</option>)}
                                        <option value="Otro">Otro</option>
                                    </select>
                                ) : (
                                    <div className="font-bold text-sm dark:text-white">{tool.tipo}</div>
                                )}
                            </div>
                            <div className="col-span-12 sm:col-span-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Detalle</label>
                                {canEditPrices ? (
                                    <input type="text" value={tool.detalle || ''} onChange={(e) => updateTooling(tool.id, 'detalle', e.target.value)} placeholder="Opcional..." className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                                ) : (
                                    <div className="text-sm dark:text-gray-300">{tool.detalle || '-'}</div>
                                )}
                            </div>
                            <div className="col-span-3 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cant.</label>
                                {canEditPrices ? (
                                    <input type="number" value={tool.cantidad} onChange={(e) => updateTooling(tool.id, 'cantidad', parseInt(e.target.value))} className="w-full p-2 border rounded text-sm text-center dark:bg-gray-700 dark:text-white" />
                                ) : (
                                    <div className="text-sm font-bold text-center dark:text-white">{tool.cantidad}</div>
                                )}
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio (USD)</label>
                                {canEditPrices ? (
                                    <input type="number" value={tool.precioUnitario} onChange={(e) => updateTooling(tool.id, 'precioUnitario', parseFloat(e.target.value))} className="w-full p-2 border rounded text-sm text-right dark:bg-gray-700 dark:text-white" />
                                ) : (
                                    <div className="text-sm font-bold text-right dark:text-white">U$S {tool.precioUnitario}</div>
                                )}
                            </div>
                            <div className="col-span-3 sm:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dto %</label>
                                {canEditPrices ? (
                                    <input type="number" min="0" max="100" value={tool.descuento || 0} onChange={(e) => updateTooling(tool.id, 'descuento', parseFloat(e.target.value))} className="w-full p-2 border rounded text-sm text-center bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:text-white" />
                                ) : (
                                    <div className="text-sm text-center font-bold text-green-600">{tool.descuento || 0}%</div>
                                )}
                            </div>
                            {canEditPrices && (
                                <div className="col-span-2 sm:col-span-1 flex justify-center pb-2">
                                    <button onClick={() => removeTooling(tool.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            )}
                        </div>
                    ))}
                    {canEditPrices && (
                        <button onClick={addToolingCost} className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 px-3 py-2 rounded hover:bg-green-50 transition-colors">
                            <PlusIcon className="h-4 w-4" /> Agregar Ítem Extra
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* NOTAS ADICIONALES Y EXPEDICIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Para Asistente Comercial (Visible si existe o si es Cotizador) */}
            {(canEditPrices || generalNotes) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Notas para Asistente Comercial</h4>
                    {canEditPrices ? (
                        <textarea 
                            value={generalNotes} 
                            onChange={e => setGeneralNotes(e.target.value)} 
                            className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white" 
                            rows={3} 
                            placeholder="Detalles sobre precios, alternativas..."
                        />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{generalNotes || 'Sin notas.'}</p>
                    )}
                </div>
            )}

            {/* Para Preprensa (Visible si existe o si es Cotizador) */}
            {(canEditPrices || preprensaNotes) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Notas para Preprensa/Arte</h4>
                    {canEditPrices ? (
                        <textarea 
                            value={preprensaNotes} 
                            onChange={e => setPreprensaNotes(e.target.value)} 
                            className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white" 
                            rows={3} 
                            placeholder="Instrucciones técnicas para clisés y arte..."
                        />
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{preprensaNotes || 'Sin notas.'}</p>
                    )}
                </div>
            )}
            
            {/* SECCIÓN EXPEDICIÓN */}
            <div className="col-span-full bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-indigo-800 dark:text-indigo-200">Expedición / Logística</h4>
                    {canEditPrices && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={alertExpedition} 
                                onChange={e => setAlertExpedition(e.target.checked)} 
                                className="h-4 w-4 text-indigo-600 rounded"
                            />
                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Alertar a Expedición</span>
                        </label>
                    )}
                </div>
                {canEditPrices ? (
                    <textarea 
                        value={expeditionNotes} 
                        onChange={e => setExpeditionNotes(e.target.value)} 
                        className="w-full p-2 border border-indigo-200 dark:border-indigo-700 rounded text-sm dark:bg-gray-700 dark:text-white" 
                        rows={2} 
                        placeholder="Ej: Entregar urgente, Cliente retira, Dirección especial..."
                    />
                ) : (
                    <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap flex-1">{expeditionNotes || 'Sin instrucciones especiales.'}</p>
                        {alertExpedition && (
                            <button onClick={sendExpeditionMail} className="ml-4 text-xs bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 transition-colors flex items-center gap-1">
                                ✉️ Notificar Ahora
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {canApproveReject && (
            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setShowRejectModal(true)} className="px-6 py-3 border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg font-bold text-lg w-full sm:w-auto">
                    Rechazar
                </button>
                <button onClick={() => setShowApproveModal(true)} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg shadow-lg transform transition hover:scale-105 w-full sm:w-auto">
                    Aprobar Cotización
                </button>
            </div>
        )}
        
        {canEditPrices && (
             <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                        Total Estimado: <span className="font-bold text-gray-900 dark:text-white">{currencySymbol}{calculateTotal().toLocaleString()}</span>
                    </div>
                    <button onClick={() => setShowSaveQuoteModal(true)} className="w-full sm:w-auto px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                        {quote.estado === QuoteStatus.Cotizado ? 'Actualizar Precios' : 'Finalizar Cotización'}
                    </button>
                </div>
            </div>
        )}
      </div>

      <ConfirmationModal isOpen={showSaveQuoteModal} onCancel={() => setShowSaveQuoteModal(false)} onConfirm={handleSaveQuote} title={quote.estado === QuoteStatus.Cotizado ? "Corregir Precios" : "Confirmar Cotización"} message={quote.estado === QuoteStatus.Cotizado ? "¿Confirmar corrección de precios?" : "¿Estás seguro de que deseas finalizar esta cotización?"} confirmText={quote.estado === QuoteStatus.Cotizado ? "Guardar Cambios" : "Enviar Cotización"} confirmButtonClassName="bg-orange-600 hover:bg-orange-700" />
      <ConfirmationModal isOpen={showApproveModal} onCancel={() => setShowApproveModal(false)} onConfirm={handleApprove} title="Aprobar Cotización" message="¿Estás seguro de aprobar? Pasará a producción." confirmText="Aprobar" confirmButtonClassName="bg-green-600 hover:bg-green-700" />
      <ConfirmationModal isOpen={showDeleteModal} onCancel={() => setShowDeleteModal(false)} onConfirm={handleDeleteQuote} title="Eliminar Solicitud" message="¿Está seguro?" confirmText="Eliminar" confirmButtonClassName="bg-red-600 hover:bg-red-700" />
      <ConfirmationModal isOpen={showReactivateModal} onCancel={() => setShowReactivateModal(false)} onConfirm={handleReactivate} title="Reactivar Cotización" message="La cotización volverá a estado Pendiente. ¿Continuar?" confirmText="Reactivar" confirmButtonClassName="bg-purple-600 hover:bg-purple-700" />
      
      {viewImage && <ImageModal src={viewImage} alt="Vista Previa" isOpen={!!viewImage} onClose={() => setViewImage(null)} />}
      
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {(user.role === UserRole.Cotizador || user.role === UserRole.Director) ? 'Rechazar Solicitud (Técnico)' : 'Rechazar Cotización'}
                </h3>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full p-3 border rounded-md dark:bg-gray-700 dark:text-white" rows={4} placeholder="Motivo..." />
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">Cancelar</button>
                    <button onClick={handleReject} disabled={!rejectionReason.trim()} className="px-4 py-2 text-white bg-red-600 rounded-md">Confirmar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;
