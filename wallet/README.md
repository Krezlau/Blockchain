# Blockchain

## Uruchomienie aplikacji

npm run dev

## Zapisywanie kliczy

Domyślnie klucze zapisywane są w folderze "keys"

## Przykładowe requesty

Utworzenie tożsamości (kluczy):
curl -X POST http://localhost:3000/api/create-identity -H "Content-Type: application/json" -d '{"encryptionPassword": "password"}'

Zaszyfrowanie tekstu:
curl -X POST http://localhost:3000/api/encrypt-data -H "Content-Type: application/json" -d '{"publicKeyPath": "keys/crypto_pub_key.pem","textToEncrypt": "Tajny tekst do zaszyfrowania kluczem publicznym"}'

Odszyfrowanie tekstu:
curl -X POST http://localhost:3000/api/decrypt-data -H "Content-Type: application/json" -d '{"privateKeyPath": "keys/crypto_priv_key.pem", "password": "password","encryptedText": "mj/Fo5e4bffgDnVQ9A02BcMmDS+wZwSCMVe5uQN8aYi2Zutjzr4ACnITB7VP8nIau4X40oMsGNzghYfyeDzepbQnKtnhwAD9tZCmlF+nIz5NTi9LFzV0ZHQZmz20co+OONHXYK+ViDFezAGjh8V0/SC0g5CUV5ClJ0Cg9rcNDk6hkDanDMUOJbGpQi5ZyqusrdbXetAlbX5SrwD2gbJYTPZT8pd0+pJnbc58dcDAfT0+XAE4UA3I5f8Jqxte6/dpWvUfqyAKIPMtMq3Zoou/1v8OYGlYThCEAoLxgIrFGQJcCLTbJKMecNgJl9To0obCcO4IOhSCB7s5GDz/cs8RMQ=="}'
