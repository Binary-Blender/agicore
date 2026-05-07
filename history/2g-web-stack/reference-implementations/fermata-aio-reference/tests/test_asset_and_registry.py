import asyncio

from src.database.repositories import InMemoryAssetRepository
from src.modules import module_registry, QCModule
from src.modules.base import BaseModule, ModuleDefinition


class _DummyModule(BaseModule):
    """Minimal concrete module used for asset creation tests."""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="dummy",
            name="Dummy",
            description="Test helper module",
            category="action",
            inputs=[],
            outputs=["artifacts"],
            config_schema={},
        )

    async def execute(self, inputs, execution_context):
        return {"artifacts": []}


def test_qc_module_is_registered():
    """The workflow engine must be able to instantiate QC checkpoints by type."""
    module_cls = module_registry.get("qc_review")
    assert module_cls is QCModule, "QC module should be registered globally"
    instance = module_cls("qc1", {"review_mode": "individual"})
    assert instance.get_definition().type == "qc_review"


def test_asset_creation_enriches_metadata():
    repo = InMemoryAssetRepository()
    module = _DummyModule("mod-1", {})
    module._set_asset_repo(repo)
    context = {
        "workflow_id": "wf_123",
        "execution_id": "exec_123",
        "module_labels": {"mod-1": "Generate Images"},
    }

    async def _create():
        return await module.create_asset(
            asset_type="image",
            url="s3://bucket/sample.png",
            metadata={
                "prompt": "sunset over the mountains",
                "provider": "openai",
                "provider_metadata": {"model": "gpt-image"},
                "quality_metrics": {"confidence": 0.91},
                "tags": ["demo", "sunset"],
            },
            execution_context=context,
        )

    asset = asyncio.run(_create())

    assert asset.workflow_execution_id == "exec_123"
    assert asset.workflow_id == "wf_123"
    assert asset.provider == "openai"
    assert asset.provider_metadata["model"] == "gpt-image"
    assert asset.quality_metrics["confidence"] == 0.91
    assert asset.asset_metadata["module_label"] == "Generate Images"
    assert asset.tags == ["demo", "sunset"]
