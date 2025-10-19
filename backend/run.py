from app import create_app
import logging
import sys

app = create_app()

if __name__ == '__main__':
    # Configurar logging para ver todas las peticiones
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stdout
    )
    
    # Forzar flush del stdout
    sys.stdout.reconfigure(line_buffering=True)
    
    # Habilitar el logger de werkzeug (servidor de desarrollo)
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.setLevel(logging.INFO)
    werkzeug_logger.addHandler(logging.StreamHandler(sys.stdout))
    
    print("\n" + "="*60)
    print("🚀 SERVIDOR FLASK INICIADO")
    print("="*60)
    print("📍 URL: http://localhost:5000")
    print("🔍 Modo Debug: ACTIVADO")
    print("📊 Logging: ACTIVADO")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=True)