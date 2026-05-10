import { fetchNaverTopTurnoverQuotes } from '../../src/services/koreanEquities';

type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

type CacheEntry = {
  expiresAt: number;
  body: string;
};

export function createDomesticTopTurnoverHandler(fetchQuotes = fetchNaverTopTurnoverQuotes) {
  let domesticCache: CacheEntry | undefined;

  return async function handler(_request: unknown, response: ResponseLike) {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      if (domesticCache && domesticCache.expiresAt > Date.now()) {
        response.end(domesticCache.body);
        return;
      }

      const body = JSON.stringify(await fetchQuotes());
      domesticCache = {
        body,
        expiresAt: Date.now() + 30_000,
      };
      response.end(body);
    } catch (error) {
      response.statusCode = 502;
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  };
}

export default createDomesticTopTurnoverHandler();
