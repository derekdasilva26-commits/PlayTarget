from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "PlayTarget API está rodando"}