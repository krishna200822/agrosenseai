"""Small smoke tests for non-AI endpoints. Run with: pip install pytest httpx; pytest"""
from fastapi.testclient import TestClient
from app.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_crop_catalogue_shape():
    with TestClient(app) as client:
        response = client.get("/crops/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert all("imageKey" in item and "durationDays" in item for item in data)


def test_crops_filter_by_season():
    with TestClient(app) as client:
        response = client.get("/crops/recommendations")
        assert response.status_code == 200
        assert {item["season"] for item in response.json()} <= {"kharif", "rabi", "zaid"}
