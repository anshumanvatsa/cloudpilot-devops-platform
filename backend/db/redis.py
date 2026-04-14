from redis import Redis
from redis.exceptions import RedisError

from core.config import get_settings

settings = get_settings()


def get_redis() -> Redis | None:
    try:
        client = Redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        return client
    except RedisError:
        return None
