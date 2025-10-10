import psycopg2
from bcrypt import hashpw, gensalt

# Probar conexión directa a PostgreSQL
try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='982619321',
        database='parroquia_db'
    )
    print("✅ Conexión directa a PostgreSQL exitosa")
    
    # Verificar usuario
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = 'admin@parroquia.com'")
    user = cursor.fetchone()
    print(f"✅ Usuario encontrado: {user[1] if user else 'None'}")
    
    # Verificar contraseña
    if user:
        hashed_password = user[3]  # password_hash está en la posición 3
        password = 'Admin123!'
        if hashpw(password.encode('utf-8'), hashed_password.encode('utf-8')) == hashed_password.encode('utf-8'):
            print("✅ Contraseña válida")
        else:
            print("❌ Contraseña inválida")
    
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")