#!/usr/bin/env python3
"""
Script para gerar ícones PWA em diferentes tamanhos a partir do logotipo Fix Fogões
"""

from PIL import Image, ImageDraw
import os

def create_icons():
    """Gera ícones PWA em diferentes tamanhos"""
    
    # Verificar se o logotipo existe
    logo_path = "fix fogoes.png"
    if not os.path.exists(logo_path):
        print(f"❌ Erro: Arquivo {logo_path} não encontrado!")
        return False
    
    # Criar pasta de ícones se não existir
    icons_dir = "public/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # Tamanhos necessários para PWA
    sizes = [72, 96, 128, 144, 152, 192, 384, 512]
    
    try:
        # Abrir logotipo original
        with Image.open(logo_path) as img:
            print(f"📸 Logotipo original: {img.size}")
            
            # Converter para RGBA se necessário
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Gerar ícones normais
            for size in sizes:
                # Redimensionar mantendo proporção
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Salvar ícone normal
                icon_path = f"{icons_dir}/icon-{size}.png"
                resized.save(icon_path, "PNG", optimize=True)
                print(f"✅ Criado: {icon_path}")
            
            # Gerar ícones maskable (com padding)
            for size in [192, 512]:
                # Criar canvas com padding (20% de cada lado)
                canvas_size = size
                icon_size = int(size * 0.6)  # 60% do tamanho total
                padding = (canvas_size - icon_size) // 2
                
                # Criar canvas transparente
                canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
                
                # Redimensionar logo
                resized_logo = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                
                # Colar logo no centro do canvas
                canvas.paste(resized_logo, (padding, padding), resized_logo)
                
                # Salvar ícone maskable
                maskable_path = f"{icons_dir}/icon-maskable-{size}.png"
                canvas.save(maskable_path, "PNG", optimize=True)
                print(f"✅ Criado: {maskable_path}")
        
        print("\n🎉 Todos os ícones foram gerados com sucesso!")
        print(f"📁 Localização: {icons_dir}/")
        
        # Listar arquivos criados
        print("\n📋 Arquivos criados:")
        for file in sorted(os.listdir(icons_dir)):
            if file.endswith('.png'):
                file_path = os.path.join(icons_dir, file)
                file_size = os.path.getsize(file_path)
                print(f"   {file} ({file_size:,} bytes)")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao processar imagem: {e}")
        return False

def create_shortcuts_icons():
    """Cria ícones para shortcuts do PWA"""
    
    icons_dir = "public/icons"
    
    # Ícones simples para shortcuts (96x96)
    shortcuts = [
        ("shortcut-new-order.png", "#4CAF50"),      # Verde para nova OS
        ("shortcut-calendar.png", "#2196F3"),       # Azul para agenda
        ("shortcut-reports.png", "#FF9800"),        # Laranja para relatórios
        ("shortcut-tracking.png", "#9C27B0")        # Roxo para rastreamento
    ]
    
    for filename, color in shortcuts:
        # Criar ícone simples colorido
        img = Image.new('RGBA', (96, 96), color)
        
        # Adicionar borda arredondada
        mask = Image.new('L', (96, 96), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([0, 0, 95, 95], radius=15, fill=255)
        
        # Aplicar máscara
        img.putalpha(mask)
        
        # Salvar
        shortcut_path = f"{icons_dir}/{filename}"
        img.save(shortcut_path, "PNG", optimize=True)
        print(f"✅ Criado shortcut: {shortcut_path}")

if __name__ == "__main__":
    print("🚀 Gerando ícones PWA para Fix Fogões...")
    
    if create_icons():
        create_shortcuts_icons()
        print("\n✨ Processo concluído! Agora faça upload dos ícones para o servidor.")
    else:
        print("\n❌ Falha na geração dos ícones.")
