import React, { useState, useEffect, useCallback, useMemo } from 'react';
// IMPORTAÇÕES LIMPAS E CORRETAS PARA FIREBASE (DEIXE O AMBIENTE VERCEL RESOLVER)
import { initializeApp } from 'firebase/app';
import * as auth from "firebase/auth"; 
import * as firestore from "firebase/firestore"; 

// Variáveis globais MANDATÓRIAS do ambiente
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Define as chaves para armazenar as senhas/pins de acesso (usaremos para simular roles)
const ADMIN_PIN = '1234'; // PIN de exemplo para ADM
const CAIXA_PIN = '0000'; // PIN de exemplo para CAIXA

// --- Configuração e Hooks do Firebase ---

// Define os paths de coleções/documentos no Firestore (usando o caminho /public/data para dados compartilhados)
const getEmployeesCollection = (db) => firestore.collection(db, `artifacts/${appId}/public/data/employees`);
const getClosingsDoc = (db, date) => firestore.doc(db, `artifacts/${appId}/public/data/daily_closings`, date);
const getWorkLogDoc = (db, date) => firestore.doc(db, `artifacts/${appId}/public/data/work_log`, date);

// Define os valores fixos do negócio
const DAILY_SALARY = 60.00;
const DAILY_CONSUMPTION_CREDIT = 15.00;

function useFirebase() {
    const [db, setDb] = useState(null);
    const [authService, setAuthService] = useState(null); // Renomeado para evitar conflito com o import 'auth'
    const [userId, setUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            // USO CORRIGIDO
            const firestoreService = firestore.getFirestore(app); 
            const authServiceInstance = auth.getAuth(app);

            setDb(firestoreService);
            setAuthService(authServiceInstance); // Define o novo nome de estado

            // 1. Autenticação inicial
            const authenticate = async () => {
                try {
                    if (initialAuthToken) {
                        // USO CORRIGIDO
                        await auth.signInWithCustomToken(authServiceInstance, initialAuthToken);
                    } else {
                        // USO CORRIGIDO
                        await auth.signInAnonymously(authServiceInstance);
                    }
                } catch (error) {
                    console.error("Erro na autenticação:", error);
                    // USO CORRIGIDO
                    await auth.signInAnonymously(authServiceInstance);
                }
            };

            authenticate();

            // 2. Listener de estado de autenticação
            // USO CORRIGIDO
            const unsubscribe = auth.onAuthStateChanged(authServiceInstance, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                }
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Erro ao inicializar Firebase:", e);
            setIsLoading(false);
        }
    }, []);

    // Retorna o authService com o novo nome
    return { db, auth: authService, userId, isLoading }; 
}

// --- Funções Auxiliares ---

const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

// --- Componentes ---

// ----------------------------------------
// 0. Role Selector (Login)
// ----------------------------------------
const RoleSelector = ({ setRole, employees }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [pin, setPin] = useState('');
    const [employeeId, setEmployeeId] = useState(localStorage.getItem('employeeId') || '');
    const [error, setError] = useState('');

    const handleLogin = () => {
        setError('');

        if (selectedRole === 'admin' && pin === ADMIN_PIN) {
            localStorage.setItem('role', 'admin');
            setRole('admin');
        } else if (selectedRole === 'caixa' && pin === CAIXA_PIN) {
            localStorage.setItem('role', 'caixa');
            setRole('caixa');
        } else if (selectedRole === 'employee' && employeeId) {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                localStorage.setItem('role', 'employee');
                localStorage.setItem('employeeId', employeeId);
                setRole('employee');
            } else {
                setError('ID do Funcionário inválido.');
            }
        } else {
            setError('PIN/Dados incorretos.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm space-y-6">
                <h2 className="text-3xl font-bold text-gray-900 text-center">Acesso ao Sistema</h2>

                <div className="space-y-4">
                    <label className="block text-gray-700 font-semibold">Selecione seu Perfil:</label>
                    <select
                        value={selectedRole}
                        onChange={(e) => { setSelectedRole(e.target.value); setError(''); setPin(''); if(e.target.value !== 'employee') setEmployeeId(''); }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">-- Selecione --</option>
                        <option value="admin">Administrador (ADM)</option>
                        <option value="caixa">Controle de Caixa</option>
                        <option value="employee">Funcionário (Consumo)</option>
                    </select>

                    {(selectedRole === 'admin' || selectedRole === 'caixa') && (
                        <input
                            type="password"
                            placeholder={`PIN de Acesso (${selectedRole.toUpperCase()})`}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg"
                        />
                    )}

                    {selectedRole === 'employee' && (
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">-- Selecione seu Nome --</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    onClick={handleLogin}
                    disabled={!selectedRole || (selectedRole !== 'employee' && !pin) || (selectedRole === 'employee' && !employeeId)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
                >
                    Entrar
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">
                    PIN ADM: {ADMIN_PIN} | PIN Caixa: {CAIXA_PIN}
                </p>
            </div>
        </div>
    );
};


// ----------------------------------------
// 1. Employee Management (Admin View)
// ----------------------------------------

const EmployeeManagement = ({ db, employees, setEmployees }) => {
    const [name, setName] = useState('');
    const [isDelivery, setIsDelivery] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) return setError('O nome é obrigatório.');

        setIsSubmitting(true); 

        try {
            // USO CORRIGIDO
            const newEmployeeRef = firestore.doc(getEmployeesCollection(db));
            // USO CORRIGIDO
            await firestore.setDoc(newEmployeeRef, {
                name: name.trim(),
                isDelivery: isDelivery,
                credit: 0, // Crédito inicial
                salaryBase: DAILY_SALARY, // Salário base fixo (R$60)
                createdAt: new Date().toISOString()
            });

            setName('');
            setIsDelivery(false);
        } catch (e) {
            console.error("ERRO CRÍTICO ao adicionar funcionário (Verifique as Regras do Firestore):", e.code, e.message);
            setError(`Falha ao adicionar funcionário. Verifique se as permissões do Firebase estão configuradas. Código do Erro: ${e.code || e.name}`);
        } finally {
            setIsSubmitting(false); 
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Gerenciamento de Funcionários</h2>

            <form onSubmit={handleAddEmployee} className="flex flex-col md:flex-row gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do Funcionário"
                    className="p-2 border border-gray-300 rounded-lg flex-grow"
                    required
                    disabled={isSubmitting} 
                />
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="isDelivery"
                        checked={isDelivery}
                        onChange={(e) => setIsDelivery(e.target.checked)}
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={isSubmitting}
                    />
                    <label htmlFor="isDelivery" className="text-gray-700">Entregador</label>
                </div>
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50"
                    disabled={isSubmitting} 
                >
                    {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </button>
            </form>

            {/* Exibição de erro detalhada */}
            {error && <p className="text-red-500 mb-4 font-semibold p-2 bg-red-50 border border-red-200 rounded-lg">{error}</p>}

            <h3 className="text-xl font-semibold mb-3 text-gray-700 flex justify-between items-center">
                Equipe Atual ({employees.length})
                {employees.length === 0 && (
                    <span className="text-xs text-red-600 bg-yellow-100 p-1 rounded font-normal">
                        A lista está vazia. Verifique as regras de leitura/escrita do Firebase.
                    </span>
                )}
            </h3>
            <div className="space-y-3">
                {employees.map(emp => (
                    <div key={emp.id} className="p-3 bg-white border border-gray-200 rounded-lg flex justify-between items-center shadow-sm text-sm md:text-base flex-wrap">
                        <div className="font-medium text-gray-800 w-full md:w-auto">
                            {emp.name} {emp.isDelivery ? '🏍️' : '🧑‍💼'}
                        </div>
                        <div className="flex flex-col md:flex-row md:space-x-4 items-start md:items-center w-full md:w-auto mt-2 md:mt-0">
                            <span className="text-md font-semibold text-green-600">
                                Crédito: {formatCurrency(emp.credit)}
                            </span>
                            <span className="text-xs text-gray-500 truncate" title={`ID: ${emp.id}`}>
                                ID: {emp.id.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ----------------------------------------
// 2. Daily Closing (Cash Flow and Credit - Admin/Caixa View)
// ----------------------------------------

const DailyClosing = ({ db, employees, dailyClosingData, workLog, setWorkLog, handleSaveClosing, handleMarkAttendance, isLoading, selectedDate }) => {

    const deliveryEmployees = useMemo(() => employees.filter(e => e.isDelivery), [employees]);

    const [tempClosures, setTempClosures] = useState({
        saldoInicial: dailyClosingData?.saldoInicial || 0,
        entradaTroco: dailyClosingData?.entradaTroco || 0,
        saidaCaixa: dailyClosingData?.saidaCaixa || 0,

        entradasRecebimentos: dailyClosingData?.entradasRecebimentos || [],
        trocoContado: dailyClosingData?.trocoContado || 0,
        notasAltasContadas: dailyClosingData?.notasAltasContadas || 0,

        valorEntrega: dailyClosingData?.valorEntrega || 6.00,
        acrescimoFixo: dailyClosingData?.acrescimoFixo || 25.00,

        employeeConsumption: workLog.employees.map(emp => ({
            id: emp.id,
            consumption: emp.consumption || 0,
        }))
    });

    const handleChange = useCallback((field, value) => {
        setTempClosures(prev => ({ ...prev, [field]: value }));
    }, []);

    useEffect(() => {
        if (dailyClosingData) {
            setTempClosures(prev => ({
                ...prev, 
                saldoInicial: dailyClosingData.saldoInicial || 0,
                entradaTroco: dailyClosingData.entradaTroco || 0,
                saidaCaixa: dailyClosingData.saidaCaixa || 0,
                entradasRecebimentos: dailyClosingData.entradasRecebimentos || [],
                trocoContado: dailyClosingData.trocoContado || 0,
                notasAltasContadas: dailyClosingData.notasAltasContadas || 0,
                valorEntrega: dailyClosingData.valorEntrega || 6.00,
                acrescimoFixo: dailyClosingData.acrescimoFixo || 25.00,
            }));
        }
        
        if (workLog) {
            setTempClosures(prev => ({
                ...prev,
                employeeConsumption: workLog.employees.map(workEntry => {
                    const existingConsumption = prev.employeeConsumption.find(c => c.id === workEntry.id);
                    return {
                        id: workEntry.id,
                        consumption: workEntry.consumption || existingConsumption?.consumption || 0, 
                    };
                }),
            }));
        }
    }, [dailyClosingData, workLog]); 

    const addRecebimento = () => {
        setTempClosures(prev => ({
            ...prev,
            entradasRecebimentos: [...prev.entradasRecebimentos, { nome: '', valor: 0 }]
        }));
    };

    const calculatedTotals = useMemo(() => {
        const totalRecebimentos = tempClosures.entradasRecebimentos.reduce((sum, entry) => sum + (parseFloat(entry.valor) || 0), 0);
        const totalContado = (parseFloat(tempClosures.trocoContado) || 0) + (parseFloat(tempClosures.notasAltasContadas) || 0);

        const subtotalApurado = (parseFloat(tempClosures.saldoInicial) || 0) +
                                (parseFloat(tempClosures.entradaTroco) || 0) +
                                totalRecebimentos -
                                (parseFloat(tempClosures.saidaCaixa) || 0);

        const diferencaCaixa = totalContado - subtotalApurado;

        const deliveryCommissions = deliveryEmployees.map(emp => {
            const deliveries = workLog.employees.find(w => w.id === emp.id)?.deliveries || 0;
            const acrescimo = deliveries > 0 ? (parseFloat(tempClosures.acrescimoFixo) || 0) : 0;
            const commission = (deliveries * (parseFloat(tempClosures.valorEntrega) || 0)) + acrescimo;
            return { id: emp.id, name: emp.name, deliveries, commission };
        });

        return { totalRecebimentos, totalContado, subtotalApurado, diferencaCaixa, deliveryCommissions };
    }, [tempClosures, workLog.employees, deliveryEmployees]);

    const handleFinalize = async () => {
        const confirm = window.confirm("Tem certeza que deseja FINALIZAR o Fechamento? Esta ação atualizará o crédito dos funcionários e só pode ser feita uma vez por dia (idealmente).");
        if (confirm) {
            await handleSaveClosing(tempClosures, calculatedTotals.diferencaCaixa);
        }
    };
    
    // CORREÇÃO: Handler para atualizar o consumo diretamente no workLog (estado centralizado)
    const handleConsumptionInDailyClosing = useCallback((employeeId, consumptionValue) => {
        setWorkLog(prev => ({
            ...prev,
            employees: prev.employees.map(emp =>
                emp.id === employeeId ? { ...emp, consumption: consumptionValue } : emp
            )
        }));
    }, [setWorkLog]);


    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Fechamento do Dia: {formatDate(selectedDate)}</h2>

            <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
                <h3 className="text-xl font-bold mb-3 text-blue-800">Escala / Presença</h3>
                <p className="text-sm text-blue-700 mb-4">Marque quem trabalhou hoje para calcular o Crédito de Consumo (+R${DAILY_CONSUMPTION_CREDIT},00)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {employees.map(emp => (
                        <div key={emp.id} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id={`work-${emp.id}`}
                                checked={workLog.employees.some(w => w.id === emp.id)}
                                onChange={() => handleMarkAttendance(emp.id, !workLog.employees.some(w => w.id === emp.id))}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor={`work-${emp.id}`} className="text-gray-700 font-medium">{emp.name}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100">
                    <h3 className="text-2xl font-bold mb-4 text-gray-800">Movimentações de Caixa</h3>

                    <div className="space-y-3">
                        <InputCaixa label="Início do dia" id="saldoInicial" value={tempClosures.saldoInicial} onChange={(v) => handleChange('saldoInicial', v)} disabled={isLoading} />
                        <InputCaixa label="Entrada para troco" id="entradaTroco" value={tempClosures.entradaTroco} onChange={(v) => handleChange('entradaTroco', v)} disabled={isLoading} />
                        <InputCaixa label="Saída de Caixa (Despesas)" id="saidaCaixa" value={tempClosures.saidaCaixa} onChange={(v) => handleChange('saidaCaixa', v)} disabled={isLoading} />
                    </div>

                    <div className="border-t border-dashed mt-6 pt-4 space-y-2">
                        <p className="flex justify-between font-semibold text-gray-700">
                            Total Recebimentos (Entradas): <span>{formatCurrency(calculatedTotals.totalRecebimentos)}</span>
                        </p>
                        <p className="flex justify-between text-2xl font-extrabold text-blue-600">
                            Subtotal Apurado: <span>{formatCurrency(calculatedTotals.subtotalApurado)}</span>
                        </p>
                    </div>

                    <div className="mt-8 space-y-3">
                        <h4 className="font-semibold text-lg text-gray-700">Contagem Física (Final)</h4>
                        <InputCaixa label="Troco contado" id="trocoContado" value={tempClosures.trocoContado} onChange={(v) => handleChange('trocoContado', v)} disabled={isLoading} />
                        <InputCaixa label="Notas altas contadas" id="notasAltasContadas" value={tempClosures.notasAltasContadas} onChange={(v) => handleChange('notasAltasContadas', v)} disabled={isLoading} />
                        <p className="flex justify-between font-semibold text-gray-700 pt-2">
                            Total Contado: <span className="text-xl text-gray-900">{formatCurrency(calculatedTotals.totalContado)}</span>
                        </p>
                    </div>

                    <div className="border-t mt-4 pt-4">
                        <p className="flex justify-between text-2xl font-extrabold">
                            Diferença de Caixa:
                            <span className={calculatedTotals.diferencaCaixa === 0 ? 'text-gray-500' : calculatedTotals.diferencaCaixa > 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(calculatedTotals.diferencaCaixa)}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100">
                        <h3 className="text-2xl font-bold mb-4 text-gray-800">Lançamento de Recebimentos</h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {tempClosures.entradasRecebimentos.map((entrada, index) => (
                                <RecebimentoInput
                                    key={index}
                                    index={index}
                                    entrada={entrada}
                                    setTempClosures={setTempClosures}
                                />
                            ))}
                        </div>
                        <button onClick={addRecebimento} className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-full transition duration-200 text-sm">
                            + Adicionar Recebimento
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100">
                        <h3 className="text-2xl font-bold mb-4 text-gray-800">Crédito & Comissões</h3>

                        <h4 className="font-semibold text-lg text-blue-700 mb-2">Consumo do Funcionário</h4>
                        {workLog.employees.length > 0 ? (
                            workLog.employees.map(w => {
                                const emp = employees.find(e => e.id === w.id);
                                if (!emp) return null;
                                const consumption = w.consumption || 0;

                                return (
                                    <ConsumptionInputCaixa
                                        key={emp.id}
                                        employee={emp}
                                        consumption={consumption}
                                        handleConsumption={handleConsumptionInDailyClosing}
                                    />
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500">Nenhum funcionário marcado na escala.</p>
                        )}

                        <div className="border-t border-dashed my-4 pt-4">
                            <h4 className="font-semibold text-lg text-purple-700 mb-2">Comissões de Entregadores</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <InputCaixa label="Valor/Entrega" id="valorEntrega" value={tempClosures.valorEntrega} onChange={(v) => handleChange('valorEntrega', v)} disabled={isLoading} />
                                <InputCaixa label="Acréscimo Fixo" id="acrescimoFixo" value={tempClosures.acrescimoFixo} onChange={(v) => handleChange('acrescimoFixo', v)} disabled={isLoading} />
                            </div>

                            {calculatedTotals.deliveryCommissions.map(comm => {
                                const workEntry = workLog.employees.find(w => w.id === comm.id);
                                const deliveries = workEntry?.deliveries || 0;
                                return (
                                    <div key={comm.id} className="flex justify-between items-center mt-3 p-2 bg-purple-50 rounded-lg">
                                        <div className='flex items-center space-x-2'>
                                            <span className="font-medium text-purple-800">{comm.name} ({deliveries} Entregas):</span>
                                            <input
                                                type="number"
                                                value={deliveries}
                                                onChange={(e) => setWorkLog(prev => ({
                                                    ...prev,
                                                    employees: prev.employees.map(w =>
                                                        w.id === comm.id ? { ...w, deliveries: parseInt(e.target.value) || 0 } : w
                                                    )
                                                }))}
                                                className="w-16 p-1 border rounded text-sm text-center"
                                            />
                                        </div>
                                        <span className="font-bold text-xl text-purple-600">{formatCurrency(comm.commission)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={handleFinalize} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-xl shadow-lg transition duration-200">
                FINALIZAR FECHAMENTO DO DIA
            </button>
        </div>
    );
};


// ----------------------------------------
// 3. Employee Consumption View
// ----------------------------------------

const EmployeeConsumptionView = ({ db, employee }) => {
    const [consumption, setConsumption] = useState(0);
    const [message, setMessage] = useState('');

    const currentCredit = employee.credit || 0;
    const remainingCredit = currentCredit - consumption;

    const handleSaveConsumption = async () => {
        setMessage('');
        if (consumption <= 0) return setMessage('O consumo deve ser maior que zero.');

        const confirm = window.confirm(`Confirmar o registro de consumo de ${formatCurrency(consumption)}? Seu novo crédito será ${formatCurrency(remainingCredit)}.`);
        if (!confirm) return;

        try {
            const employeeRef = firestore.doc(getEmployeesCollection(db), employee.id);

            // USO CORRIGIDO
            await firestore.runTransaction(db, async (transaction) => {
                const employeeDoc = await transaction.get(employeeRef);

                if (employeeDoc.exists()) {
                    const currentCreditInDB = employeeDoc.data().credit || 0;

                    const newCredit = currentCreditInDB - consumption; 

                    transaction.update(employeeRef, {
                        credit: newCredit,
                    });
                } else {
                    throw new Error("Documento do funcionário não encontrado.");
                }
            });

            setMessage(`Consumo de ${formatCurrency(consumption)} registrado com sucesso! Crédito restante: ${formatCurrency(remainingCredit)}`);
            setConsumption(0); 

        } catch (e) {
            console.error("Erro ao registrar consumo:", e);
            setMessage(`ERRO ao registrar consumo. Tente novamente. Detalhe: ${e.message}`);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg space-y-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900">Olá, {employee.name}!</h2>
                <h3 className="text-xl font-semibold text-green-600">
                    Seu Crédito Acumulado: {formatCurrency(currentCredit)}
                </h3>
                
                <div className="space-y-4 pt-4 border-t">
                    <label className="block text-gray-700 font-semibold text-left">Valor Consumido Hoje (R$):</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 12.50"
                        value={consumption}
                        onChange={(e) => setConsumption(parseFloat(e.target.value) || 0)}
                        className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center"
                    />
                </div>

                <p className={`text-lg font-bold ${remainingCredit < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {remainingCredit < 0 
                        ? `Atenção! Você está gastando ${formatCurrency(Math.abs(remainingCredit))} acima do limite!`
                        : `Crédito após consumo: ${formatCurrency(remainingCredit)}`
                    }
                </p>
                
                {message && <p className="text-sm font-medium text-purple-700">{message}</p>}

                <button
                    onClick={handleSaveConsumption}
                    disabled={consumption <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
                >
                    Registrar Consumo
                </button>
            </div>
        </div>
    );
};

// ----------------------------------------
// Sub-componentes
// ----------------------------------------

const InputCaixa = ({ label, value, onChange, disabled }) => (
    <div className="flex justify-between items-center">
        <label className="text-gray-600">{label}:</label>
        <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-32 p-2 border border-gray-300 rounded-lg text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={disabled}
        />
    </div>
);

const RecebimentoInput = ({ index, entrada, setTempClosures }) => {
    const handleChange = (field, value) => {
        setTempClosures(prev => ({
            ...prev,
            entradasRecebimentos: prev.entradasRecebimentos.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleRemove = () => {
        setTempClosures(prev => ({
            ...prev,
            entradasRecebimentos: prev.entradasRecebimentos.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="flex gap-2 items-center">
            <input 
                type="text" 
                placeholder="Nome/Descrição" 
                value={entrada.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                className="p-2 border border-gray-300 rounded-lg flex-grow"
            />
            <input 
                type="number" 
                step="0.01" 
                placeholder="Valor (R$)" 
                value={entrada.valor}
                onChange={(e) => handleChange('valor', parseFloat(e.target.value) || 0)}
                className="w-24 p-2 border border-gray-300 rounded-lg text-right"
            />
            <button onClick={handleRemove} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded-lg transition duration-200 flex-shrink-0">
                X
            </button>
        </div>
    );
};

const ConsumptionInputCaixa = ({ employee, consumption, handleConsumption }) => {
    const newCredit = employee.credit + DAILY_CONSUMPTION_CREDIT; 
    const remainingCredit = newCredit - consumption;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b">
            <div className="font-medium text-gray-800">
                {employee.name}
            </div>
            <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                <span className="text-sm font-bold text-purple-700">
                    Limite: {formatCurrency(newCredit)}
                </span>
                <input
                    type="number"
                    step="0.01"
                    value={consumption}
                    onChange={(e) => handleConsumption(employee.id, parseFloat(e.target.value) || 0)}
                    className="w-32 p-1 border rounded-lg text-right text-sm"
                />
                <span className={`font-semibold text-sm ${remainingCredit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {remainingCredit < 0 ? `Excesso: ${formatCurrency(Math.abs(remainingCredit))}` : `Restante: ${formatCurrency(remainingCredit)}`}
                </span>
            </div>
        </div>
    );
};

// ----------------------------------------
// 4. Main Application Component
// ----------------------------------------

const App = () => {
    // Agora o useFirebase retorna 'auth' (o objeto completo)
    const { db, userId, isLoading } = useFirebase(); 
    const [role, setRole] = useState(localStorage.getItem('role') || null); 
    const [view, setView] = useState('dashboard'); 
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Firestore States
    const [employees, setEmployees] = useState([]);
    const [dailyClosingData, setDailyClosingData] = useState(null);
    const [workLog, setWorkLog] = useState({ employees: [] });
    
    // UI State
    const [statusMessage, setStatusMessage] = useState('');

    // Efeito para carregar a lista de funcionários em tempo real
    useEffect(() => {
        if (!db) return;
        const employeesRef = getEmployeesCollection(db);
        // USO CORRIGIDO
        const q = firestore.query(employeesRef);

        // USO CORRIGIDO
        const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEmployees(list);
            
            console.log(`[DEBUG] Funcionários carregados: ${list.length}. Firestore ativo.`);
        });

        return () => unsubscribe();
    }, [db]);
    
    // Efeito para carregar os dados de fechamento e log de trabalho para a data selecionada
    useEffect(() => {
        if (!db || !selectedDate) return;

        // 1. Carrega dados do fechamento do caixa
        const closingDocRef = getClosingsDoc(db, selectedDate);
        // USO CORRIGIDO
        const unsubscribeClosing = firestore.onSnapshot(closingDocRef, (docSnap) => {
            setDailyClosingData(docSnap.exists() ? docSnap.data() : null);
        });

        // 2. Carrega o log de trabalho (escala e entregas)
        const workLogDocRef = getWorkLogDoc(db, selectedDate);
        // USO CORRIGIDO
        const unsubscribeWorkLog = firestore.onSnapshot(workLogDocRef, (docSnap) => {
            setWorkLog(docSnap.exists() ? docSnap.data() : { employees: [] });
        });

        return () => {
            unsubscribeClosing();
            unsubscribeWorkLog();
        };
    }, [db, selectedDate]);


    // Handler: Marcar presença (Escala)
    const handleMarkAttendance = useCallback((employeeId, isPresent) => {
        setWorkLog(prev => {
            const existingEntry = prev.employees.find(emp => emp.id === employeeId);
            
            let employeesList;

            if (isPresent) {
                employeesList = [
                    ...prev.employees.filter(emp => emp.id !== employeeId), 
                    {
                        id: employeeId,
                        deliveries: existingEntry?.deliveries || 0,
                        consumption: existingEntry?.consumption || 0
                    }
                ];
            } else {
                employeesList = prev.employees.filter(emp => emp.id !== employeeId);
            }
            
            return { ...prev, employees: employeesList };
        });
    }, []);

    // Handler: Registrar Consumo (Usado APENAS pelo Caixa)
    const handleConsumption = useCallback((employeeId, consumptionValue) => {
        setWorkLog(prev => ({
            ...prev,
            employees: prev.employees.map(emp => 
                emp.id === employeeId ? { ...emp, consumption: consumptionValue } : emp
            )
        }));
    }, []);
    
    // Handler: Salvar fechamento e atualizar créditos (TRANSATION!)
    const handleSaveClosing = async (tempClosures, diferencaCaixa) => {
        if (!db || !userId) return;

        try {
            // USO CORRIGIDO
            await firestore.runTransaction(db, async (transaction) => {
                const closingDocRef = getClosingsDoc(db, selectedDate);
                const workLogDocRef = getWorkLogDoc(db, selectedDate);
                const employeesCollection = getEmployeesCollection(db);

                // 1. Salva os dados do Fechamento de Caixa
                const closingData = {
                    ...tempClosures,
                    diferencaCaixa: diferencaCaixa,
                    date: selectedDate,
                    closedBy: userId,
                    closedAt: new Date().toISOString()
                };
                transaction.set(closingDocRef, closingData);

                // 2. Salva o Log de Trabalho
                transaction.set(workLogDocRef, workLog); 

                // 3. Atualiza os Créditos dos Funcionários (APENAS para quem está na escala)
                for (const workEntry of workLog.employees) {
                    const employeeRef = firestore.doc(employeesCollection, workEntry.id);
                    const employeeDoc = await transaction.get(employeeRef);

                    if (employeeDoc.exists()) {
                        const currentCredit = employeeDoc.data().credit || 0;
                        
                        const creditEarned = DAILY_CONSUMPTION_CREDIT; 
                        const consumption = workEntry.consumption || 0;
                        
                        const newCredit = currentCredit + creditEarned - consumption;

                        transaction.update(employeeRef, {
                            credit: newCredit,
                        });
                    }
                }
            });

            setStatusMessage(`Fechamento do dia ${formatDate(selectedDate)} e créditos atualizados!`);
            setTimeout(() => setStatusMessage(''), 5000);
            
        } catch (e) {
            console.error("Transação de Fechamento falhou:", e);
            setStatusMessage(`ERRO ao finalizar: ${e.message}. Verifique as permissões de transação.`);
        }
    };

    const handleLogout = () => {
        setRole(null);
        localStorage.removeItem('role');
        localStorage.removeItem('employeeId');
    };

    const renderHeader = () => (
        <header className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-md">
            <h1 className="text-xl font-bold text-gray-800">Sistema de Caixa V2 ({role.toUpperCase()})</h1>
            <div className="flex space-x-4 items-center">
                {(role === 'admin' || role === 'caixa') && (
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg"
                    />
                )}
                {role === 'admin' && (
                    <button 
                        onClick={() => setView(view === 'dashboard' ? 'employees' : 'dashboard')}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 hidden sm:block"
                    >
                        {view === 'dashboard' ? 'Gerenciar Equipe' : 'Voltar ao Caixa'}
                    </button>
                )}
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                    Sair
                </button>
            </div>
        </header>
    );

    const renderView = () => {
        if (!db || isLoading) {
            return <LoadingScreen message="Conectando ao Firebase..." />;
        }
        
        if (!role) {
            return <RoleSelector setRole={setRole} employees={employees} />;
        }

        const employeeId = localStorage.getItem('employeeId');
        
        if (role === 'employee' && employeeId) {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                return <EmployeeConsumptionView db={db} employee={employee} />;
            } else {
                return <RoleSelector setRole={setRole} employees={employees} />; 
            }
        }

        // Views for Admin and Caixa (Cashier)
        return (
            <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
                {renderHeader()}
                
                {statusMessage && (
                    <div className="p-3 mb-4 bg-yellow-100 text-yellow-800 rounded-lg text-center font-medium">
                        {statusMessage}
                    </div>
                )}

                <main>
                    {view === 'employees' && role === 'admin' ? (
                        <EmployeeManagement db={db} employees={employees} setEmployees={setEmployees} />
                    ) : (
                        <DailyClosing
                            db={db}
                            employees={employees}
                            dailyClosingData={dailyClosingData}
                            workLog={workLog}
                            setWorkLog={setWorkLog}
                            handleSaveClosing={handleSaveClosing}
                            handleMarkAttendance={handleMarkAttendance}
                            handleConsumption={handleConsumption}
                            isLoading={isLoading}
                            selectedDate={selectedDate}
                        />
                    )}
                </main>

                <footer className="mt-8 text-center text-sm text-gray-500 border-t pt-4">
                    User ID: {userId || 'Desconhecido'}
                </footer>
            </div>
        );
    };

    return renderView();
};

const LoadingScreen = ({ message }) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-600">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4">{message}</p>
    </div>
);

export default App;