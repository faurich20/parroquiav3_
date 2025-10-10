# backfill_jti.py (ejecutar con python backfill_jti.py)
from app import create_app, db
from app.models import RefreshToken
from flask_jwt_extended import decode_token

app = create_app()
with app.app_context():
    tokens = RefreshToken.query.filter(RefreshToken.jti == None).all()
    for t in tokens:
        try:
            decoded = decode_token(t.token)
            jti = decoded.get('jti')
            t.jti = jti
            db.session.add(t)
        except Exception as e:
            print("No se pudo decodear token id:", t.id, e)
    db.session.commit()
    print("Backfill completado")
