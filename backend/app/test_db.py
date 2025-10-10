import psycopg2
try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='982619321',
        database='parroquia_db'
    )
    print("✅ Conexión directa a PostgreSQL exitosa")
    conn.close()
except Exception as e:
    print(f"❌ Error conectando a PostgreSQL: {e}")