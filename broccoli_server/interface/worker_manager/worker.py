from abc import ABCMeta, abstractmethod
from broccoli_server.scheduler.worker_context import WorkContext


class Worker(metaclass=ABCMeta):
    @abstractmethod
    def get_id(self) -> str:
        pass

    @abstractmethod
    def pre_work(self, context: WorkContext):
        pass

    @abstractmethod
    def work(self, context: WorkContext):
        pass
