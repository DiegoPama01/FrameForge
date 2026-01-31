from abc import ABC, abstractmethod
from typing import Any, Dict, List


class WorkflowNodeDefinition(ABC):
    id: str
    label: str
    icon: str
    description: str
    parameters: List[Dict[str, Any]]

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        raise NotImplementedError
