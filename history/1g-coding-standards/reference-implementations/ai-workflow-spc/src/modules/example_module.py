"""
Example workflow module template.

Use this file as a starting point when creating new modules. It shows the
standard imports, definition wiring, and asset-centric execution pattern.
"""

from typing import Any, Dict, List
from .base import BaseModule, ModuleDefinition


class ExampleModule(BaseModule):
    """Hello-world module template."""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="example_module",
            name="Example Module",
            description="Minimal template for new modules",
            category="action",
            inputs=["images"],
            outputs=["images"],
            config_schema={
                "type": "object",
                "properties": {
                    "note": {
                        "type": "string",
                        "description": "Optional message logged during execution"
                    }
                }
            },
            icon="🧩"
        )

    async def execute_with_asset_ids(
        self,
        input_asset_ids: Dict[str, List[str]],
        execution_context: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        """
        Asset-centric entry point.

        1. Fetch input assets via helper from BaseModule.
        2. Perform processing (here we just echo inputs).
        3. Create or forward asset IDs for downstream modules.
        """
        self._log_info(
            execution_context,
            "Example module running",
            {"note": self.config.get("note")}
        )

        if not input_asset_ids.get("images"):
            return {"images": []}

        # Forward inputs directly. If you mutate/create new assets, use
        # await self.create_asset(...) and return the new IDs instead.
        return {"images": input_asset_ids["images"]}


# Builder Palette Registration Notes:
#
# 1. Add `{ type: 'example_module', name: 'Example Module', icon: '🧩', isDraggable: true }`
#    to the desired category inside `frontend/builder.html`.
# 2. Extend `moduleInputs` and `moduleConfigs` in the same file so the
#    form renders configuration + input selectors.
# 3. Update `getOutputKeyForInput` / `getDefaultOutputKey` if the module
#    produces new output keys beyond `images`.
