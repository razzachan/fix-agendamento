const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
    console.log('🚀 Gerando ícones PWA para Fix Fogões...');
    
    const logoPath = 'fix fogoes.png';
    const iconsDir = 'public/icons';
    
    // Verificar se o logotipo existe
    if (!fs.existsSync(logoPath)) {
        console.error(`❌ Erro: Arquivo ${logoPath} não encontrado!`);
        return false;
    }
    
    // Criar pasta de ícones se não existir
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    // Tamanhos necessários para PWA
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    try {
        // Obter informações da imagem original
        const metadata = await sharp(logoPath).metadata();
        console.log(`📸 Logotipo original: ${metadata.width}x${metadata.height}`);
        
        // Gerar ícones normais
        for (const size of sizes) {
            const outputPath = path.join(iconsDir, `icon-${size}.png`);
            
            await sharp(logoPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png({ quality: 90, compressionLevel: 9 })
                .toFile(outputPath);
            
            console.log(`✅ Criado: ${outputPath}`);
        }
        
        // Gerar ícones maskable (com padding)
        for (const size of [192, 512]) {
            const outputPath = path.join(iconsDir, `icon-maskable-${size}.png`);
            const iconSize = Math.floor(size * 0.6); // 60% do tamanho total
            const padding = Math.floor((size - iconSize) / 2);
            
            // Criar canvas transparente
            const canvas = sharp({
                create: {
                    width: size,
                    height: size,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                }
            });
            
            // Redimensionar logo
            const resizedLogo = await sharp(logoPath)
                .resize(iconSize, iconSize, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toBuffer();
            
            // Compor logo no centro do canvas
            await canvas
                .composite([{
                    input: resizedLogo,
                    top: padding,
                    left: padding
                }])
                .png({ quality: 90, compressionLevel: 9 })
                .toFile(outputPath);
            
            console.log(`✅ Criado: ${outputPath}`);
        }
        
        // Gerar ícones para shortcuts
        await generateShortcutIcons(iconsDir);
        
        console.log('\n🎉 Todos os ícones foram gerados com sucesso!');
        console.log(`📁 Localização: ${iconsDir}/`);
        
        // Listar arquivos criados
        console.log('\n📋 Arquivos criados:');
        const files = fs.readdirSync(iconsDir)
            .filter(file => file.endsWith('.png'))
            .sort();
        
        for (const file of files) {
            const filePath = path.join(iconsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   ${file} (${stats.size.toLocaleString()} bytes)`);
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ Erro ao processar imagem: ${error.message}`);
        return false;
    }
}

async function generateShortcutIcons(iconsDir) {
    console.log('\n🔗 Gerando ícones para shortcuts...');
    
    const shortcuts = [
        { name: 'shortcut-new-order.png', color: '#4CAF50' },      // Verde para nova OS
        { name: 'shortcut-calendar.png', color: '#2196F3' },       // Azul para agenda
        { name: 'shortcut-reports.png', color: '#FF9800' },        // Laranja para relatórios
        { name: 'shortcut-tracking.png', color: '#9C27B0' }        // Roxo para rastreamento
    ];
    
    for (const shortcut of shortcuts) {
        const outputPath = path.join(iconsDir, shortcut.name);
        
        // Converter cor hex para RGB
        const hex = shortcut.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Criar ícone colorido simples
        await sharp({
            create: {
                width: 96,
                height: 96,
                channels: 4,
                background: { r, g, b, alpha: 1 }
            }
        })
        .png({ quality: 90 })
        .toFile(outputPath);
        
        console.log(`✅ Criado shortcut: ${outputPath}`);
    }
}

// Executar
generateIcons().then(success => {
    if (success) {
        console.log('\n✨ Processo concluído! Agora faça upload dos ícones para o servidor.');
        console.log('\n📤 Próximos passos:');
        console.log('1. Faça upload da pasta public/icons/ para o servidor');
        console.log('2. Verifique se os ícones estão acessíveis em https://app.fixfogoes.com.br/icons/');
        console.log('3. Tente gerar o APK iOS novamente no PWA Builder');
    } else {
        console.log('\n❌ Falha na geração dos ícones.');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
});
