import { Response } from "express";

interface PaginationMeta {
  total_page: number;
  current_page: number;
  total_item: number;
  per_page: number;
}

interface PaginationLinks {
  next: boolean;
  prev: boolean;
}

interface PaginationQuery {
  lastPage?: number;
  currentPage?: number;
  total?: number;
  perPage?: number;
  hasMorePages?: boolean;
  previousPageUrl?: string | null;
}

interface JsonHeaders {
  [key: string]: string;
}

class ResponseBuilder<T = any> {
  private status: boolean;
  private message: string | null = null;
  private data: T | null = null;
  private httpCode: number = 200;
  private meta: PaginationMeta | null = null;
  private link: PaginationLinks | null = null;
  private authToken: string | null = null;

  constructor(status: boolean) {
    this.status = status;
  }

  static success<T>(
    data: T | null = null,
    message: string | null = null,
    httpCode = 200
  ): ResponseBuilder<T> {
    return this.asSuccess<T>()
      .withData(data)
      .withMessage(message)
      .withHttpCode(httpCode);
  }

  static successWithPagination<T>(
    query: PaginationQuery,
    data: T | null = null,
    message: string | null = null,
    httpCode = 200
  ): ResponseBuilder<T> {
    return this.asSuccess<T>()
      .withData(data)
      .withMessage(message)
      .withHttpCode(httpCode)
      .withPagination(query);
  }

  static successWithToken<T>(
    token: string,
    data: T | null = null,
    message: string | null = null,
    httpCode = 200
  ): ResponseBuilder<T> {
    return this.asSuccess<T>()
      .withAuthToken(token)
      .withData(data)
      .withMessage(message)
      .withHttpCode(httpCode);
  }

  static error<T>(
    message: string,
    httpCode = 400,
    data: T | null = null
  ): ResponseBuilder<T> {
    return this.asError<T>()
      .withData(data)
      .withMessage(message)
      .withHttpCode(httpCode);
  }

  static successMessage<T>(
    message: string,
    httpCode = 200,
    data: T | null = null
  ): ResponseBuilder<T> {
    return this.asSuccess<T>()
      .withData(data)
      .withMessage(message)
      .withHttpCode(httpCode);
  }

  static asSuccess<T>(): ResponseBuilder<T> {
    return new this<T>(true);
  }

  static asError<T>(): ResponseBuilder<T> {
    return new this<T>(false);
  }

  withMessage(message: string | null): this {
    this.message = message;
    return this;
  }

  withData(data: T | null): this {
    this.data = data;
    return this;
  }

  withHttpCode(httpCode: number): this {
    this.httpCode = httpCode;
    return this;
  }

  withPagination(query: PaginationQuery): this {
    this.meta = {
      total_page: query.lastPage ?? 0,
      current_page: query.currentPage ?? 0,
      total_item: query.total ?? 0,
      per_page: query.perPage ?? 0,
    };

    this.link = {
      next: query.hasMorePages ?? false,
      prev: !!query.previousPageUrl,
    };

    return this;
  }

  withAuthToken(token: string | null): this {
    this.authToken = token;
    return this;
  }

  build(res: Response): Response {
    const response: Record<string, any> = {
      status: this.status,
    };

    if (this.message !== null) response.message = this.message;
    if (this.authToken !== null) response.token = this.authToken;
    if (this.data !== null) response.data = this.data;
    if (this.meta !== null) response.meta = this.meta;
    if (this.link !== null) response.link = this.link;

    return res.status(this.httpCode).json(response);
  }

  static json(
    message = "",
    data: any = {},
    httpCode = 200,
    errors: Record<string, any> | null = null,
    headers: JsonHeaders = {}
  ) {
    const body = {
      message,
      errors: errors ?? {},
      data: Object.keys(data).length === 0 ? {} : data,
    };

    return {
      statusCode: httpCode,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    };
  }
}

export default ResponseBuilder;