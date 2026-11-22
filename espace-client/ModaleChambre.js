import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const RoomDetailsModal = ({ isOpen, onClose, room, hotel, allRooms, onReserveClick }) => {
    const navigate = useNavigate();
    const [localRoom, setLocalRoom] = useState(room);
    const [currentImgIndex, setCurrentImgIndex] = useState(0);

    const scrollRef = useRef(null);
    const [unitImgIndices, setUnitImgIndices] = useState({});

    useEffect(() => {
        if (isOpen) {
            setLocalRoom(room);
            setCurrentImgIndex(0);
            setUnitImgIndices({});
        }
    }, [room, isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [localRoom?.id]);

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentImgIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentImgIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };
    
    const displayImages = useMemo(() => {
        if (!localRoom) return [];
        const roomImages = localRoom.urlImage ? localRoom.urlImage.split(',').filter(Boolean) : [];
        let rawImages = [...roomImages];
        if (hotel?.urlImage) rawImages.push(hotel.urlImage);
        return [...new Set(rawImages)];
    }, [localRoom, hotel]);

    const handleUnitImgChange = (unitId, dir, total) => {
        setUnitImgIndices(prev => {
            const current = prev[unitId] || 0;
            const next = (current + dir + total) % total;
            return { ...prev, [unitId]: next };
        });
    };

    if (!isOpen || !localRoom) return null;

    return (
        <div className="modal-overlay animate-fade-in" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div className="bg-white rounded-4 shadow-lg overflow-hidden position-relative d-flex flex-column"
                 style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh' }}>
                
                {/* Header (Fermeture) */}
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                    <h4 className="fw-900 mb-0 text-dark">Détails de la {localRoom.type}</h4>
                    <button onClick={onClose} className="btn btn-light rounded-circle shadow-sm border p-0 d-flex align-items-center justify-content-center hover-scale" style={{width:'36px', height:'36px'}}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Corps Scrollable */}
                <div ref={scrollRef} className="p-4 overflow-auto" style={{ flex: '1 1 auto' }}>
                    
                    {/* Carousel Layout */}
                    <div className="position-relative mb-4 shadow-sm rounded-4 overflow-hidden bg-light" style={{ height: '450px' }}>
                        {displayImages.length === 0 ? (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                                <i className="bi bi-camera fs-1"></i>
                            </div>
                        ) : (
                            <>
                                <img 
                                    src={displayImages[currentImgIndex]} 
                                    alt={`Room ${currentImgIndex + 1}`} 
                                    className="w-100 h-100 object-fit-cover transition-all"
                                    key={currentImgIndex}
                                />
                                
                                {displayImages.length > 1 && (
                                    <>
                                        {/* Arrows */}
                                        <button 
                                            onClick={prevImage}
                                            className="position-absolute top-50 start-0 translate-middle-y ms-3 btn btn-white rounded-circle shadow-lg d-flex align-items-center justify-content-center transition-all hover-scale"
                                            style={{ width: '45px', height: '45px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)' }}
                                        >
                                            <i className="bi bi-chevron-left fs-5"></i>
                                        </button>
                                        <button 
                                            onClick={nextImage}
                                            className="position-absolute top-50 end-0 translate-middle-y me-3 btn btn-white rounded-circle shadow-lg d-flex align-items-center justify-content-center transition-all hover-scale"
                                            style={{ width: '45px', height: '45px', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.9)' }}
                                        >
                                            <i className="bi bi-chevron-right fs-5"></i>
                                        </button>

                                        {/* Counter Badge */}
                                        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 bg-dark bg-opacity-75 text-white px-3 py-1 rounded-pill small fw-700">
                                            {currentImgIndex + 1} / {displayImages.length}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>



                    {/* Physical Units List - Detailed Version */}
                    <div className="mt-5 border-top pt-4">
                        <h4 className="fw-800 mb-4 d-flex align-items-center">
                            <i className="bi bi-grid-3x3-gap-fill text-primary me-2"></i> Toutes les chambres disponibles dans cette catégorie
                        </h4>
                        <div className="d-flex flex-column gap-4">
                            {(allRooms || []).filter(r => r.type === localRoom.type).map((unit, idx) => {
                                const unitImages = unit.urlImage ? unit.urlImage.split(',').filter(Boolean) : [];
                                if (hotel?.urlImage) unitImages.push(hotel.urlImage);
                                const unitUniqueImages = [...new Set(unitImages)];
                                
                                const currentIdx = unitImgIndices[unit.id] || 0;
                                const mainImg = unitUniqueImages[currentIdx] || hotel?.urlImage;
                                
                                return (
                                    <div 
                                        key={unit.id} 
                                        className={`card border-0 shadow-sm rounded-4 overflow-hidden transition-all hover-translate-y ${localRoom.id === unit.id ? 'ring-2 ring-primary bg-primary-subtle bg-opacity-10' : 'bg-light bg-opacity-50'}`}
                                        style={{ border: localRoom.id === unit.id ? '2px solid #0d6efd' : '1px solid #dee2e6' }}
                                    >
                                        <div className="row g-0">
                                            {/* Left: Mini Carousel */}
                                            <div className="col-md-4 position-relative" style={{ minHeight: '200px' }}>
                                                <img 
                                                    src={mainImg} 
                                                    alt={unit.nom} 
                                                    className="w-100 h-100 object-fit-cover cursor-pointer" 
                                                    onClick={() => { setLocalRoom(unit); setCurrentImgIndex(0); }}
                                                />
                                                {unitUniqueImages.length > 1 && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleUnitImgChange(unit.id, -1, unitUniqueImages.length); }}
                                                            className="btn btn-dark btn-sm rounded-circle position-absolute top-50 start-0 translate-middle-y ms-2 opacity-75 hover-opacity-100"
                                                            style={{ width: '32px', height: '32px', padding: 0 }}
                                                        >
                                                            <i className="bi bi-chevron-left small"></i>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleUnitImgChange(unit.id, 1, unitUniqueImages.length); }}
                                                            className="btn btn-dark btn-sm rounded-circle position-absolute top-50 end-0 translate-middle-y me-2 opacity-75 hover-opacity-100"
                                                            style={{ width: '32px', height: '32px', padding: 0 }}
                                                        >
                                                            <i className="bi bi-chevron-right small"></i>
                                                        </button>
                                                        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 d-flex gap-1">
                                                            {unitUniqueImages.map((_, i) => (
                                                                <span key={i} className={`rounded-circle ${i === currentIdx ? 'bg-white' : 'bg-white opacity-50'}`} style={{ width: '6px', height: '6px' }}></span>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {/* Right: Content */}
                                            <div className="col-md-8 p-4 d-flex flex-column">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <h5 className="fw-800 mb-1">{unit.nom || `Chambre #${idx + 1}`}</h5>
                                                        <div className="badge bg-white text-primary border border-primary-subtle fw-700 rounded-pill px-3">
                                                            {unit.nbLitsSimples > 0 && `${unit.nbLitsSimples} simple(s)`}
                                                            {unit.nbLitsSimples > 0 && unit.nbLitsDoubles > 0 && ' + '}
                                                            {unit.nbLitsDoubles > 0 && `${unit.nbLitsDoubles} double(s)`}
                                                        </div>
                                                    </div>
                                                    <div className="text-end">
                                                        {['QUADRUPLE','FAMILIALE','SUITE'].includes(unit.type) ? (
                                                            <>
                                                                <div className="h4 fw-900 text-primary mb-0">
                                                                    {unit.prixLibre || '—'} {unit.prixLibre ? 'DT' : ''}
                                                                </div>
                                                                <div className="small text-muted fw-600">prix libre</div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="d-flex flex-column gap-1 align-items-end">
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="badge bg-primary-subtle text-primary fw-700 rounded-pill" style={{fontSize:'0.6rem'}}>Adulte</span>
                                                                        <span className="fw-900 fs-5 text-primary mb-0">{unit.prix} DT</span>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="badge bg-secondary-subtle text-secondary fw-700 rounded-pill" style={{fontSize:'0.6rem'}}>Suppl.</span>
                                                                        <span className="small fw-700 text-muted">{unit.prixParAdulte || '—'} {unit.prixParAdulte ? 'DT' : ''}</span>
                                                                    </div>
                                                                    {unit.prixLibre > 0 && (
                                                                        <div className="d-flex align-items-center gap-2">
                                                                            <span className="badge bg-warning-subtle text-warning fw-700 rounded-pill" style={{fontSize:'0.6rem'}}>Libre</span>
                                                                            <span className="small fw-700 text-muted">{unit.prixLibre} DT</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-secondary small fw-600 mb-3 flex-grow-1">
                                                    {unit.description || `Cette ${unit.type.toLowerCase()} offre un confort standard et un aménagement soigné pour votre séjour.`}
                                                </p>

                                                <div className="d-flex flex-wrap gap-3 mb-3">
                                                    {unit.aWifi !== false && <span className="small fw-700 text-dark"><i className="bi bi-wifi text-success me-1"></i> Wifi</span>}
                                                    {unit.aClimatisation !== false && <span className="small fw-700 text-dark"><i className="bi bi-snow text-primary me-1"></i> AC</span>}
                                                    {unit.aVueSurMer && <span className="small fw-700 text-dark"><i className="bi bi-tsunami text-info me-1"></i> Vue Mer</span>}
                                                    {unit.aBalcon && <span className="small fw-700 text-dark"><i className="bi bi-building text-success me-1"></i> Balcon</span>}
                                                </div>

                                                <div className="d-flex gap-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const token = localStorage.getItem('token');
                                                            if (!token) {
                                                                onClose();
                                                                navigate('/login');
                                                                return;
                                                            }
                                                            onClose();
                                                            onReserveClick(unit.type, { nbLitsSimples: unit.nbLitsSimples, nbLitsDoubles: unit.nbLitsDoubles });
                                                        }}
                                                        className="btn btn-primary btn-lg flex-grow-1 rounded-pill fw-800 shadow-sm hover-scale"
                                                        style={{ background: '#f97316', border: 'none' }}
                                                    >
                                                        Réserver cette chambre
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>



            <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
                
                .hover-scale { transition: transform 0.2s; cursor: pointer; }
                .hover-scale:hover { transform: scale(1.05); }

                .hover-brightness { transition: filter 0.3s ease; cursor: pointer; }
                .hover-brightness:hover { filter: brightness(0.85); }

                .text-shadow { text-shadow: 0 2px 5px rgba(0,0,0,0.8); }

                .btn-white {
                    background-color: white;
                    color: black;
                    border: none;
                }
                .btn-white:hover {
                    background-color: #f8f9fa;
                }
            `}</style>
            </div>
        </div>
    );
};

export default RoomDetailsModal;
