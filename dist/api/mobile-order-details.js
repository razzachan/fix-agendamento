/**
 * API endpoint para fornecer dados completos de uma ordem de serviço
 * para a interface mobile
 */

// Simulação de dados completos (em produção, isso viria do Supabase)
const getCompleteOrderData = async (orderId) => {
    // Aqui você faria a chamada real para o Supabase
    // Por enquanto, vamos simular dados completos
    
    const baseOrders = {
        '1': {
            id: '1',
            clientName: 'José Pereira',
            clientPhone: '(11) 99999-1234',
            clientEmail: 'jose.pereira@email.com',
            clientAddress: 'Rua das Flores, 123 - São Paulo, SP',
            equipment: 'Micro-ondas Electrolux',
            equipmentModel: 'MEF41',
            equipmentBrand: 'Electrolux',
            description: 'Micro-ondas não esquenta. Cliente relata que o aparelho liga normalmente, o prato gira, mas não aquece os alimentos.',
            status: 'pending',
            createdAt: '2024-01-15T10:30:00Z',
            technicianName: null,
            estimatedValue: 'R$ 150,00',
            paymentMethod: 'A definir',
            serviceAttendanceType: 'domicilio',
            images: [
                {
                    id: 'img1',
                    url: 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Micro-ondas+Frente',
                    name: 'micro_ondas_frente.jpg',
                    uploadedAt: '2024-01-15T10:35:00Z'
                },
                {
                    id: 'img2', 
                    url: 'https://via.placeholder.com/400x300/e5e7eb/6b7280?text=Micro-ondas+Interior',
                    name: 'micro_ondas_interior.jpg',
                    uploadedAt: '2024-01-15T10:36:00Z'
                }
            ],
            progressHistory: [
                {
                    id: 'prog1',
                    status: 'pending',
                    notes: 'Ordem de serviço criada automaticamente',
                    createdAt: '2024-01-15T10:30:00Z',
                    createdBy: 'Sistema',
                    systemGenerated: true
                },
                {
                    id: 'prog2',
                    status: 'pending',
                    notes: 'Cliente confirmou disponibilidade para atendimento na terça-feira pela manhã',
                    createdAt: '2024-01-15T14:20:00Z',
                    createdBy: 'Atendente Maria',
                    systemGenerated: false
                }
            ],
            warranty: null,
            diagnosis: null
        },
        '2': {
            id: '2',
            clientName: 'Maria Costa',
            clientPhone: '(11) 88888-5678',
            clientEmail: 'maria.costa@email.com',
            clientAddress: 'Av. Paulista, 456 - São Paulo, SP',
            equipment: 'Refrigerador Brastemp',
            equipmentModel: 'BRM50NK',
            equipmentBrand: 'Brastemp',
            description: 'Geladeira não está gelando adequadamente. Freezer funciona normal.',
            status: 'scheduled',
            createdAt: '2024-01-14T09:15:00Z',
            technicianName: 'Carlos Silva',
            estimatedValue: 'R$ 200,00',
            paymentMethod: 'Cartão de crédito',
            serviceAttendanceType: 'domicilio',
            images: [
                {
                    id: 'img3',
                    url: 'https://via.placeholder.com/400x300/dbeafe/1e40af?text=Refrigerador+Externo',
                    name: 'refrigerador_externo.jpg',
                    uploadedAt: '2024-01-14T09:20:00Z'
                }
            ],
            progressHistory: [
                {
                    id: 'prog3',
                    status: 'pending',
                    notes: 'Ordem de serviço criada',
                    createdAt: '2024-01-14T09:15:00Z',
                    createdBy: 'Sistema',
                    systemGenerated: true
                },
                {
                    id: 'prog4',
                    status: 'scheduled',
                    notes: 'Agendado para 16/01/2024 às 14:00 com técnico Carlos Silva',
                    createdAt: '2024-01-14T11:30:00Z',
                    createdBy: 'Atendente João',
                    systemGenerated: false
                }
            ],
            warranty: null,
            diagnosis: null
        },
        '3': {
            id: '3',
            clientName: 'João Santos',
            clientPhone: '(11) 77777-9012',
            clientEmail: 'joao.santos@email.com',
            clientAddress: 'Rua Augusta, 789 - São Paulo, SP',
            equipment: 'Fogão 4 bocas',
            equipmentModel: 'Atlas Mônaco',
            equipmentBrand: 'Atlas',
            description: 'Não acende as bocas. Problema no acendedor automático.',
            status: 'workshop',
            createdAt: '2024-01-13T16:45:00Z',
            technicianName: 'Ana Rodrigues',
            estimatedValue: 'R$ 120,00',
            paymentMethod: 'PIX',
            serviceAttendanceType: 'coleta_diagnostico',
            images: [
                {
                    id: 'img4',
                    url: 'https://via.placeholder.com/400x300/fef3c7/92400e?text=Fogão+Completo',
                    name: 'fogao_completo.jpg',
                    uploadedAt: '2024-01-13T16:50:00Z'
                },
                {
                    id: 'img5',
                    url: 'https://via.placeholder.com/400x300/fef3c7/92400e?text=Acendedor+Defeito',
                    name: 'acendedor_defeito.jpg',
                    uploadedAt: '2024-01-13T16:52:00Z'
                }
            ],
            progressHistory: [
                {
                    id: 'prog5',
                    status: 'pending',
                    notes: 'Ordem de serviço criada',
                    createdAt: '2024-01-13T16:45:00Z',
                    createdBy: 'Sistema',
                    systemGenerated: true
                },
                {
                    id: 'prog6',
                    status: 'collected',
                    notes: 'Equipamento coletado para diagnóstico na oficina',
                    createdAt: '2024-01-14T08:30:00Z',
                    createdBy: 'Técnico Ana',
                    systemGenerated: false
                },
                {
                    id: 'prog7',
                    status: 'workshop',
                    notes: 'Iniciado diagnóstico. Problema identificado no sistema de acendimento.',
                    createdAt: '2024-01-15T09:15:00Z',
                    createdBy: 'Técnico Ana',
                    systemGenerated: false
                }
            ],
            warranty: null,
            diagnosis: {
                problem: 'Defeito no acendedor automático',
                solution: 'Substituição do módulo de acendimento',
                parts: ['Módulo acendedor automático'],
                estimatedCost: 'R$ 120,00',
                estimatedTime: '2 horas'
            }
        },
        '4': {
            id: '4',
            clientName: 'Ana Silva',
            clientPhone: '(11) 66666-3456',
            clientEmail: 'ana.silva@email.com',
            clientAddress: 'Rua Oscar Freire, 321 - São Paulo, SP',
            equipment: 'Lava-louças',
            equipmentModel: 'Brastemp BLF12',
            equipmentBrand: 'Brastemp',
            description: 'Não está drenando água adequadamente. Água fica acumulada no fundo.',
            status: 'completed',
            createdAt: '2024-01-12T11:20:00Z',
            technicianName: 'Roberto Lima',
            estimatedValue: 'R$ 180,00',
            paymentMethod: 'Dinheiro',
            serviceAttendanceType: 'domicilio',
            images: [
                {
                    id: 'img6',
                    url: 'https://via.placeholder.com/400x300/dcfce7/166534?text=Lava-louças+Antes',
                    name: 'lava_loucas_antes.jpg',
                    uploadedAt: '2024-01-12T11:25:00Z'
                },
                {
                    id: 'img7',
                    url: 'https://via.placeholder.com/400x300/dcfce7/166534?text=Lava-louças+Depois',
                    name: 'lava_loucas_depois.jpg',
                    uploadedAt: '2024-01-12T15:30:00Z'
                }
            ],
            progressHistory: [
                {
                    id: 'prog8',
                    status: 'pending',
                    notes: 'Ordem de serviço criada',
                    createdAt: '2024-01-12T11:20:00Z',
                    createdBy: 'Sistema',
                    systemGenerated: true
                },
                {
                    id: 'prog9',
                    status: 'scheduled',
                    notes: 'Agendado para 12/01/2024 às 14:00',
                    createdAt: '2024-01-12T12:00:00Z',
                    createdBy: 'Atendente Pedro',
                    systemGenerated: false
                },
                {
                    id: 'prog10',
                    status: 'in_progress',
                    notes: 'Técnico chegou ao local e iniciou o diagnóstico',
                    createdAt: '2024-01-12T14:00:00Z',
                    createdBy: 'Técnico Roberto',
                    systemGenerated: false
                },
                {
                    id: 'prog11',
                    status: 'completed',
                    notes: 'Serviço concluído. Problema era entupimento no filtro de drenagem. Filtro limpo e testado.',
                    createdAt: '2024-01-12T15:30:00Z',
                    createdBy: 'Técnico Roberto',
                    systemGenerated: false
                }
            ],
            warranty: {
                id: 'war1',
                startDate: '2024-01-12',
                endDate: '2024-04-12',
                description: 'Garantia de 90 dias para o serviço de limpeza do sistema de drenagem',
                type: 'service'
            },
            diagnosis: null
        }
    };
    
    return baseOrders[orderId] || null;
};

// Função principal da API
const handleRequest = async (orderId) => {
    try {
        const orderData = await getCompleteOrderData(orderId);
        
        if (!orderData) {
            return {
                success: false,
                error: 'Ordem de serviço não encontrada',
                data: null
            };
        }
        
        return {
            success: true,
            data: orderData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Erro ao buscar dados da ordem:', error);
        return {
            success: false,
            error: 'Erro interno do servidor',
            data: null
        };
    }
};

// Exportar para uso em outros contextos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleRequest, getCompleteOrderData };
}

// Para uso direto no browser
if (typeof window !== 'undefined') {
    window.mobileOrderAPI = { handleRequest, getCompleteOrderData };
}
