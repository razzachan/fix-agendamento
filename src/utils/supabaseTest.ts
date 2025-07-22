import { supabase } from '@/integrations/supabase/client';

export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 [testSupabaseConnection] Testando conexão com Supabase...');
    
    // Teste 1: Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ [testSupabaseConnection] Erro de autenticação:', authError);
      return false;
    }
    
    console.log('✅ [testSupabaseConnection] Usuário autenticado:', user?.email || 'Anônimo');
    
    // Teste 2: Listar scheduled_services (apenas SELECT)
    const { data: services, error: selectError } = await supabase
      .from('scheduled_services')
      .select('id, scheduled_start_time, scheduled_end_time')
      .limit(5);
    
    if (selectError) {
      console.error('❌ [testSupabaseConnection] Erro no SELECT:', selectError);
      return false;
    }
    
    console.log('✅ [testSupabaseConnection] SELECT funcionando. Serviços encontrados:', services?.length || 0);
    if (services && services.length > 0) {
      console.log('✅ [testSupabaseConnection] Exemplo de serviço:', services[0]);
    }
    
    // Teste 3: Verificar se consegue fazer UPDATE (teste com dados fictícios)
    if (services && services.length > 0) {
      const testService = services[0];
      console.log('🧪 [testSupabaseConnection] Testando UPDATE no serviço:', testService.id);
      
      // Fazer um UPDATE que não muda nada (mesma data)
      const { data: updateData, error: updateError } = await supabase
        .from('scheduled_services')
        .update({
          scheduled_start_time: testService.scheduled_start_time,
          scheduled_end_time: testService.scheduled_end_time
        })
        .eq('id', testService.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ [testSupabaseConnection] Erro no UPDATE de teste:', updateError);
        console.error('❌ [testSupabaseConnection] Código:', updateError.code);
        console.error('❌ [testSupabaseConnection] Mensagem:', updateError.message);
        return false;
      }
      
      console.log('✅ [testSupabaseConnection] UPDATE de teste funcionando!');
      console.log('✅ [testSupabaseConnection] Dados retornados:', updateData);
    }
    
    console.log('✅ [testSupabaseConnection] Todos os testes passaram!');
    return true;
  } catch (error) {
    console.error('❌ [testSupabaseConnection] Erro geral:', error);
    return false;
  }
};

// Função para testar UPDATE específico
export const testSpecificUpdate = async (serviceId: string) => {
  try {
    console.log(`🧪 [testSpecificUpdate] Testando UPDATE específico para ${serviceId}`);
    
    // Buscar o serviço atual
    const { data: currentService, error: fetchError } = await supabase
      .from('scheduled_services')
      .select('*')
      .eq('id', serviceId)
      .single();
    
    if (fetchError) {
      console.error('❌ [testSpecificUpdate] Erro ao buscar serviço:', fetchError);
      return false;
    }
    
    console.log('✅ [testSpecificUpdate] Serviço encontrado:', currentService);
    
    // Tentar UPDATE com nova data (1 hora no futuro)
    const newDate = new Date(currentService.scheduled_start_time);
    newDate.setHours(newDate.getHours() + 1);
    
    const { data: updateData, error: updateError } = await supabase
      .from('scheduled_services')
      .update({
        scheduled_start_time: newDate.toISOString(),
        scheduled_end_time: new Date(newDate.getTime() + 60 * 60 * 1000).toISOString()
      })
      .eq('id', serviceId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ [testSpecificUpdate] Erro no UPDATE:', updateError);
      return false;
    }
    
    console.log('✅ [testSpecificUpdate] UPDATE específico funcionou!', updateData);
    return true;
  } catch (error) {
    console.error('❌ [testSpecificUpdate] Erro geral:', error);
    return false;
  }
};
