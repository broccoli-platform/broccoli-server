from typing import Optional, Callable, Tuple
from .logging import logger
from .work_context import WorkContextFactory
from .worker_metadata import WorkerMetadata
from .worker_cache import WorkerCache
from .worker_config_store import WorkerConfigStore
from sentry_sdk import capture_exception
from broccoli_server.interface.worker import Worker


class WorkWrapper(object):
    def __init__(self,
                 work_context_factory: WorkContextFactory,
                 worker_cache: WorkerCache,
                 worker_config_store: WorkerConfigStore,
                 sentry_enabled: bool,
                 pause_workers: bool
                 ):
        self.work_context_factory = work_context_factory
        self.worker_cache = worker_cache
        self.worker_config_store = worker_config_store
        self.sentry_enabled = sentry_enabled
        self.pause_workers = pause_workers

    def wrap(self, worker_metadata: WorkerMetadata) -> Optional[Tuple[Callable, str]]:
        module, class_name, args, error_resiliency = \
            worker_metadata.module, worker_metadata.class_name, worker_metadata.args, worker_metadata.error_resiliency
        status, worker_or_message = self.worker_cache.load(module, class_name, args)
        if not status:
            logger.error("Fails to load worker", extra={
                'module': module,
                'class_name': class_name,
                'args': args,
                'message': worker_or_message
            })
            return None
        worker = worker_or_message  # type: Worker
        worker_id = f"broccoli.worker.{worker.get_id()}"
        work_context = self.work_context_factory.build(worker_id)
        worker.pre_work(work_context)

        def wrapped_work_func():
            try:
                if self.pause_workers:
                    logger.info("Workers have been globally paused")
                    return

                worker.work(work_context)
                # always reset error count
                ok, err = self.worker_config_store.reset_error_count(worker_id)
                if not ok:
                    logger.error("Fails to reset error count", extra={
                        'worker_id': worker_id,
                        'reason': err
                    })
            except Exception as e:
                report_ex = True
                if error_resiliency != -1:
                    ok, error_count, err = self.worker_config_store.get_error_count(worker_id)
                    if not ok:
                        logger.error("Fails to get error count", extra={
                            'worker_id': worker_id,
                            'reason': err
                        })
                    if error_count < error_resiliency:
                        # only not to report exception when error resiliency is set and error count is below resiliency
                        report_ex = False

                if report_ex:
                    if self.sentry_enabled:
                        capture_exception(e)
                    else:
                        print(str(e))
                        logger.exception("Fails to execute work", extra={
                            'worker_id': worker_id,
                        })
                else:
                    print(str(e))
                    logger.info("Not reporting exception because of error resiliency", extra={
                        'worker_id': worker_id
                    })

                if error_resiliency != -1:
                    # only to touch error count if error resiliency is set
                    ok, err = self.worker_config_store.increment_error_count(worker_id)
                    if not ok:
                        logger.error('Fails to increment error count', extra={
                            'worker_id': worker_id,
                            'reason': err
                        })

        return wrapped_work_func, worker_id
