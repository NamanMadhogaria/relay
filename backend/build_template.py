"""Retire cloud processing while preserving the existing stack's private data.

This is a maintenance template for the existing relay-dev stack, not a backend
required by Relay 0.3.0. Do not create a new stack from it for a fresh install.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def template():
    return {
        "AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Relay local recorder. Previous cloud processing removed; existing private data retained without application access.",
        "Metadata": {"AWSToolsMetrics": {"AWSAgentToolkit": "aws-cloudformation@3"}},
        "Resources": json.loads((ROOT / "retained-resources.json").read_text(encoding="utf-8")),
        "Outputs": {name: {"Value": {"Ref": name}} for name in ["UploadBucket", "JobsTable", "UserPool"]},
    }


if __name__ == "__main__":
    output = ROOT / "generated" / "template.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(template(), indent=2) + "\n", encoding="utf-8")
    print(f"Generated retention-only template: {output}")
