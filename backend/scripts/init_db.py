import os
import sys
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Agregar el directorio padre al path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

class DatabaseManager:
    def __init__(self):
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'user': 'postgres',
            'password': '982619321'
        }
    
    def check_postgres_connection(self):
        """Verifica que PostgreSQL esté disponible"""
        try:
            conn = psycopg2.connect(**self.db_config, database='postgres')
            conn.close()
            print("✅ Conexión a PostgreSQL exitosa")
            return True
        except Exception as e:
            print(f"❌ No se puede conectar a PostgreSQL: {e}")
            print("   Asegúrate de que PostgreSQL esté ejecutándose")
            return False
    
    def create_database_if_not_exists(self):
        """Crea la base de datos si no existe con codificación correcta"""
        try:
            conn = psycopg2.connect(**self.db_config, database='postgres')
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            
            # Verificar si la BD existe
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'parroquia_db'")
            exists = cursor.fetchone()
            
            if not exists:
                print("🗄️ Creando base de datos 'parroquia_db'...")
                # Crear con configuración COMPATIBLE con UTF-8
                cursor.execute("""
                    CREATE DATABASE parroquia_db
                    WITH 
                    ENCODING 'UTF8'
                    LC_COLLATE 'es_ES.UTF-8'
                    LC_CTYPE 'es_ES.UTF-8'
                    TEMPLATE template0
                    OWNER postgres
                """)
                print("✅ Base de datos creada con configuración UTF-8 compatible")
            else:
                print("✅ Base de datos 'parroquia_db' ya existe")
                
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ Error creando base de datos: {e}")
            return False
    
    def verify_database_connection(self):
        """Verifica que se pueda conectar a la base de datos específica"""
        try:
            conn = psycopg2.connect(
                host='localhost',
                port=5432,
                user='postgres',
                password='982619321',
                database='parroquia_db'
            )
            
            cursor = conn.cursor()
            # Forzar UTF-8 en la conexión actual
            cursor.execute("SET client_encoding TO 'UTF8'")
            cursor.execute("SHOW client_encoding")
            encoding = cursor.fetchone()[0]
            print(f"✅ Conexión a BD establecida. Encoding: {encoding}")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ Error conectando a la base de datos: {e}")
            return False
    
    def initialize_tables_and_data(self):
        """Ejecuta el SQL de esquema y los seeds, y asegura credenciales del admin"""
        sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'database_full.sql'))
        seed_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'seed_inserts.txt'))
        if not os.path.exists(sql_path):
            print(f"❌ No se encontró el archivo SQL: {sql_path}")
            return False

        # 1) Ejecutar el SQL estructural completo
        try:
            print(f"📄 Ejecutando SQL: {sql_path}")
            with open(sql_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database='parroquia_db'
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            cur.execute("SET client_encoding TO 'UTF8'")
            cur.execute(sql_content)
            cur.close()
            conn.close()
            print("✅ SQL ejecutado correctamente")
        except Exception as e:
            print(f"❌ Error ejecutando SQL: {e}")
            import traceback
            traceback.print_exc()
            return False

        # 2) Ejecutar seeds de datos si existe el archivo
        try:
            if os.path.exists(seed_path):
                print(f"🌱 Ejecutando seeds: {seed_path}")
                with open(seed_path, 'r', encoding='utf-8') as f:
                    seed_sql = f.read()
                conn = psycopg2.connect(
                    host=self.db_config['host'],
                    port=self.db_config['port'],
                    user=self.db_config['user'],
                    password=self.db_config['password'],
                    database='parroquia_db'
                )
                conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
                cur = conn.cursor()
                cur.execute("SET client_encoding TO 'UTF8'")
                cur.execute(seed_sql)
                cur.close()
                conn.close()
                print("✅ Seeds ejecutados correctamente")
            else:
                print("ℹ️ No se encontró seed_inserts.txt; se omitió la inserción inicial de datos")
        except Exception as e:
            print(f"❌ Error ejecutando seeds: {e}")
            import traceback
            traceback.print_exc()
            return False

        # 3) Crear app, aplicar create_all() y asegurar hash del admin
        try:
            print("⚙️ Ejecutando create_app() para aplicar create_all y asegurar admin...")
            app = create_app()
            # Asegurar hash válido del admin usando util de la app
            with app.app_context():
                from app.models import User
                from app.utils.security import hash_password
                # Asegurar existencia y hash de admin
                admin = User.query.filter_by(email='admin@parroquia.com').first()
                if admin:
                    admin.password_hash = hash_password('Admin123!')
                    db.session.commit()
                    print("✅ Admin actualizado con hash bcrypt válido")
                else:
                    # Crear si no existe (rol/admin por defecto)
                    u = User(name='Admin', email='admin@parroquia.com', role='admin', permissions=[])
                    u.password_hash = hash_password('Admin123!')
                    db.session.add(u)
                    db.session.commit()
                    print("✅ Admin creado con hash bcrypt válido")
            print("✅ Inicialización de app completada")
            return True
        except Exception as e:
            print(f"❌ Error inicializando app/seed: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    print("=" * 60)
    print("🚀 INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS PARROQUIAL")
    print("=" * 60)
    
    manager = DatabaseManager()
    
    # Paso 1: Verificar conexión a PostgreSQL
    print("\n1. 🔌 Verificando conexión a PostgreSQL...")
    if not manager.check_postgres_connection():
        return False
    
    # Paso 2: Crear base de datos si no existe
    print("\n2. 🗄️ Verificando base de datos...")
    if not manager.create_database_if_not_exists():
        return False
    
    # Paso 3: Verificar conexión a la base de datos específica
    print("\n3. 🔗 Verificando conexión a la base de datos...")
    if not manager.verify_database_connection():
        return False
    
    # Paso 4: Inicializar tablas y datos
    print("\n4. 📊 Inicializando tablas y datos...")
    if not manager.initialize_tables_and_data():
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ¡INICIALIZACIÓN COMPLETADA EXITOSAMENTE!")
    print("💡 Ahora puedes ejecutar: python run.py")
    print("=" * 60)
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)