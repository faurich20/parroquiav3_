import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Upload, Save } from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import Card from '../components/Common/Card';
import ActionButton from '../components/Common/ActionButton';
import { useAuth } from '../contexts/AuthContext';

const Personal = () => {
    const { user, authFetch } = useAuth();
    const [persona, setPersona] = useState({
        per_nombres: '',
        per_apellidos: '',
        per_domicilio: '',
        per_telefono: '',
        fecha_nacimiento: '',
        parroquiaid: ''
    });
    const [parroquias, setParroquias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');
    const fileRef = useRef(null);

    const fullName = useMemo(() => user ? (user.name || `${persona.per_nombres} ${persona.per_apellidos}`.trim()) : '', [user, persona.per_nombres, persona.per_apellidos]);

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            try {
                setLoading(true);
                const [pRes, listRes] = await Promise.all([
                    authFetch('http://localhost:5000/api/personas'),
                    authFetch('http://localhost:5000/api/parroquias')
                ]);
                const pJson = await pRes.json();
                const listJson = await listRes.json();
                if (mounted) {
                    const list = listJson.parroquias || [];
                    setParroquias(list);
                    const mine = (pJson.personas || []).find(x => x.userid === user?.id);
                    if (mine) {
                        setPersona({
                            per_nombres: mine.per_nombres || '',
                            per_apellidos: mine.per_apellidos || '',
                            per_domicilio: mine.per_domicilio || '',
                            per_telefono: mine.per_telefono || '',
                            fecha_nacimiento: (mine.fecha_nacimiento || '').slice(0,10),
                            parroquiaid: mine.parroquiaid || ''
                        });
                    } else {
                        if (list.length === 1) {
                            setPersona(prev => ({ ...prev, parroquiaid: String(list[0].parroquiaid) }));
                        }
                    }
                }
            } catch (e) {
                if (mounted) setError('No se pudo cargar la información');
            } finally {
                if (mounted) setLoading(false);
            }
        };
        if (user?.id) loadData();
        return () => { mounted = false };
    }, [user, authFetch]);

    useEffect(() => {
        if (!photoFile) { setPhotoPreview(''); return; }
        const url = URL.createObjectURL(photoFile);
        setPhotoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photoFile]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setPersona(prev => ({ ...prev, [name]: value }));
    };

    const onPickPhoto = () => fileRef.current?.click();

    const onSave = async () => {
        try {
            setSaving(true);
            setError('');
            const payload = { ...persona, userid: user.id };
            const getRes = await authFetch('http://localhost:5000/api/personas');
            const { personas = [] } = await getRes.json();
            const mine = personas.find(x => x.userid === user.id);
            if (mine) {
                await authFetch(`http://localhost:5000/api/personas/${mine.personaid}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await authFetch('http://localhost:5000/api/personas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
        } catch (e) {
            setError('No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Mi Perfil"
                subtitle="Administra tu información personal"
                icon={Users}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <div className="flex flex-col items-center gap-4 p-6">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                            {photoPreview ? (
                                <img src={photoPreview} alt="foto" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-16 h-16 text-gray-400" />
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>setPhotoFile(e.target.files?.[0]||null)} />
                        <ActionButton icon={Upload} label="Subir foto" onClick={onPickPhoto} />
                        <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">{fullName}</div>
                            <div className="text-gray-600">{user?.email}</div>
                        </div>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <div className="p-6 space-y-4">
                        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
                        {loading ? (
                            <div className="text-gray-600">Cargando...</div>
                        ) : (
                            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e)=>{e.preventDefault(); onSave();}}>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-700 text-sm">Nombres</label>
                                    <input name="per_nombres" value={persona.per_nombres} onChange={onChange} placeholder="Nombres" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-700 text-sm">Apellidos</label>
                                    <input name="per_apellidos" value={persona.per_apellidos} onChange={onChange} placeholder="Apellidos" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-gray-700 text-sm">Domicilio</label>
                                    <input name="per_domicilio" value={persona.per_domicilio} onChange={onChange} placeholder="Dirección" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-700 text-sm">Teléfono</label>
                                    <input name="per_telefono" value={persona.per_telefono} onChange={onChange} placeholder="Teléfono" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-gray-700 text-sm">Fecha de nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value={persona.fecha_nacimiento} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-gray-700 text-sm">Parroquia</label>
                                    <select name="parroquiaid" value={persona.parroquiaid} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Seleccione</option>
                                        {parroquias.map(p => (
                                            <option key={p.parroquiaid} value={p.parroquiaid}>{p.par_nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" disabled={saving} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Personal;
