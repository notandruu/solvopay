from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    alchemy_base_mainnet_rpc: str
    alchemy_webhook_signing_key: str
    backend_eoa_private_key: str
    session_factory_address: str

    class Config:
        env_file = ".env"


settings = Settings()
