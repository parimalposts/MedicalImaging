from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    data_dir: str = "/app/data"
    sqlite_path: str = "/app/data/medimaging.db"
    cors_origins: str = "http://localhost:3000"
    max_mesh_triangles: int = 500_000

    @property
    def dicoms_dir(self) -> str:
        return f"{self.data_dir}/dicoms"

    @property
    def segmentations_dir(self) -> str:
        return f"{self.data_dir}/segmentations"

    @property
    def meshes_dir(self) -> str:
        return f"{self.data_dir}/meshes"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
