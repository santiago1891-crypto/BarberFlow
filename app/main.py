from fastapi import FastAPI  


app = FastAPI(title="Barbería API")

@app.get("/")
async def root():
    return {"message": "Barbería API funcionando"}