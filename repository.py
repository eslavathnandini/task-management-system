import os
import json
from typing import TypeVar, Generic, List, Optional, Callable, Dict

T = TypeVar('T')


class InMemoryRepository(Generic[T]):
    def __init__(self, filename: Optional[str] = None, serializer: Optional[Callable[[T], dict]] = None, deserializer: Optional[Callable[[dict], T]] = None):
        self.items: Dict[str, T] = {}
        self.filePath: Optional[str] = None
        self.serializer = serializer
        self.deserializer = deserializer

        if filename:
            data_dir = os.path.join(os.path.dirname(__file__), 'data')
            os.makedirs(data_dir, exist_ok=True)
            self.filePath = os.path.join(data_dir, filename)
            self.load_from_file()

    def save(self, item: T) -> T:
        item_id = getattr(item, 'id')
        self.items[item_id] = item
        self.persist_to_file()
        return item

    def find_by_id(self, item_id: str) -> Optional[T]:
        return self.items.get(item_id)

    def find_all(self) -> List[T]:
        return list(self.items.values())

    def query(self, predicate: Callable[[T], bool]) -> List[T]:
        return [item for item in self.items.values() if predicate(item)]

    def delete(self, item_id: str) -> bool:
        if item_id in self.items:
            del self.items[item_id]
            self.persist_to_file()
            return True
        return False

    def clear(self) -> None:
        self.items.clear()
        self.persist_to_file()

    def persist_to_file(self) -> None:
        if not self.filePath or not self.serializer:
            return
        try:
            serialized_data = [self.serializer(item) for item in self.items.values()]
            with open(self.filePath, 'w', encoding='utf-8') as f:
                json.dump(serialized_data, f, indent=2)
        except Exception as e:
            print(f"Failed to persist repository data to {self.filePath}: {e}")

    def load_from_file(self) -> None:
        if not self.filePath or not self.deserializer or not os.path.exists(self.filePath):
            return
        try:
            with open(self.filePath, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    raw_list = json.loads(content)
                    for raw in raw_list:
                        item = self.deserializer(raw)
                        item_id = getattr(item, 'id')
                        self.items[item_id] = item
        except Exception as e:
            print(f"Failed to load repository data from {self.filePath}: {e}")
