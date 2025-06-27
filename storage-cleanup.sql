-- =====================================================
-- SCRIPT DE LIMPEZA DO SUPABASE STORAGE
-- Fix Fogões - Remoção de Imagens e Arquivos
-- =====================================================

-- IMPORTANTE: Execute este script APÓS o database-cleanup.sql
-- Este script remove todas as imagens e arquivos relacionados às ordens de serviço

BEGIN;

-- =====================================================
-- ETAPA 1: VERIFICAR BUCKETS EXISTENTES
-- =====================================================

-- 1.1 Listar todos os buckets
SELECT 
    id,
    name,
    created_at,
    (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = storage.buckets.id) as file_count
FROM storage.buckets
ORDER BY name;

-- =====================================================
-- ETAPA 2: LISTAR ARQUIVOS ANTES DA EXCLUSÃO
-- =====================================================

-- 2.1 Contar arquivos em cada bucket
DO $$
DECLARE
    bucket_record RECORD;
    file_count INTEGER;
BEGIN
    RAISE NOTICE '=== CONTAGEM DE ARQUIVOS ANTES DA LIMPEZA ===';
    
    FOR bucket_record IN 
        SELECT id, name FROM storage.buckets 
        WHERE name IN ('service-images', 'qr-codes', 'client-documents', 'technician-photos')
    LOOP
        SELECT COUNT(*) INTO file_count 
        FROM storage.objects 
        WHERE bucket_id = bucket_record.id;
        
        RAISE NOTICE 'Bucket "%": % arquivos', bucket_record.name, file_count;
    END LOOP;
END $$;

-- =====================================================
-- ETAPA 3: DELETAR ARQUIVOS DOS BUCKETS
-- =====================================================

-- 3.1 Deletar imagens das ordens de serviço
DELETE FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'service-images');

-- 3.2 Deletar QR codes gerados
DELETE FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'qr-codes');

-- 3.3 Deletar documentos de clientes (se existir)
DELETE FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'client-documents');

-- 3.4 Deletar fotos de técnicos relacionadas às ordens (se existir)
DELETE FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'technician-photos')
AND name LIKE '%service-order%';

-- =====================================================
-- ETAPA 4: VERIFICAÇÃO FINAL
-- =====================================================

-- 4.1 Contar arquivos restantes
DO $$
DECLARE
    bucket_record RECORD;
    file_count INTEGER;
    total_deleted INTEGER := 0;
BEGIN
    RAISE NOTICE '=== CONTAGEM DE ARQUIVOS APÓS A LIMPEZA ===';
    
    FOR bucket_record IN 
        SELECT id, name FROM storage.buckets 
        WHERE name IN ('service-images', 'qr-codes', 'client-documents', 'technician-photos')
    LOOP
        SELECT COUNT(*) INTO file_count 
        FROM storage.objects 
        WHERE bucket_id = bucket_record.id;
        
        RAISE NOTICE 'Bucket "%": % arquivos restantes', bucket_record.name, file_count;
        total_deleted := total_deleted + file_count;
    END LOOP;
    
    IF total_deleted = 0 THEN
        RAISE NOTICE '✅ Limpeza do Storage realizada com sucesso!';
    ELSE
        RAISE WARNING '⚠️  Alguns arquivos podem não ter sido removidos: % restantes', total_deleted;
    END IF;
END $$;

COMMIT;

-- =====================================================
-- SCRIPT DE STORAGE CONCLUÍDO
-- =====================================================
