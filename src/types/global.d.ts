// Global type declarations for missing modules and Node.js globals

declare module 'swagger-jsdoc' {
  interface SwaggerDefinition {
    openapi: string;
    info: {
      title: string;
      version: string;
      description?: string;
      [key: string]: any;
    };
    servers?: Array<{
      url: string;
      description?: string;
    }>;
    [key: string]: any;
  }

  interface Options {
    definition: SwaggerDefinition;
    apis: string[];
  }

  function swaggerJSDoc(options: Options): any;
  namespace swaggerJSDoc {
    interface Options {
      definition: SwaggerDefinition;
      apis: string[];
    }
  }
  export = swaggerJSDoc;
}

declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  interface SwaggerUiOptions {
    explorer?: boolean;
    swaggerOptions?: any;
    customCss?: string;
    customCssUrl?: string;
    customJs?: string;
    customfavIcon?: string;
    swaggerUrl?: string;
    customSiteTitle?: string;
  }

  export { SwaggerUiOptions };
  export function setup(swaggerDoc: any, options?: SwaggerUiOptions): RequestHandler;
  export function serve(...args: any[]): RequestHandler[];
  export function generateHTML(swaggerDoc: any, options?: SwaggerUiOptions): string;
}

// Node.js globals for API files
declare const __dirname: string;
declare const __filename: string;
declare const process: NodeJS.Process;
declare const Buffer: BufferConstructor;
declare const global: NodeJS.Global;

// Buffer type declaration
declare class Buffer extends Uint8Array {
  static alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
  static allocUnsafe(size: number): Buffer;
  static from(array: any[] | ArrayBuffer | Buffer | string, encoding?: string): Buffer;
  static isBuffer(obj: any): obj is Buffer;
  toString(encoding?: string, start?: number, end?: number): string;
}

// NodeJS namespace for timer functions
declare namespace NodeJS {
  interface Process {
    env: { [key: string]: string | undefined };
    exit(code?: number): never;
    nextTick(callback: Function, ...args: any[]): void;
    uptime(): number;
    memoryUsage(): { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
    version: string;
    platform: string;
    arch: string;
  }

  interface Global {
    [key: string]: any;
    fetch?: any;
    Headers?: any;
    Request?: any;
    Response?: any;
  }

  interface Timer {
    unref(): void;
    ref(): void;
  }

  interface Timeout extends Timer {}

  function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): Timeout;
  function clearTimeout(timeoutId: Timeout | number): void;
  function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): Timeout;
  function clearInterval(intervalId: Timeout | number): void;
}

// Module augmentation for Express Request
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

// Node.js module declarations
declare module 'fs' {
  export function readFileSync(path: string, options?: string | { encoding?: string; flag?: string }): string | Buffer;
  export function writeFileSync(path: string, data: any, options?: string | { encoding?: string; mode?: number; flag?: string }): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean; mode?: number }): void;
  export function readdirSync(path: string): string[];
  export const promises: {
    readFile: (path: string, options?: string | { encoding?: string }) => Promise<string | Buffer>;
    writeFile: (path: string, data: any, options?: string | { encoding?: string }) => Promise<void>;
    mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
  };
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
  export function normalize(path: string): string;
  export const sep: string;
  export const delimiter: string;
}

declare module 'events' {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listeners(event: string): Function[];
    listenerCount(event: string): number;
  }
}

declare module 'perf_hooks' {
  export const performance: {
    now(): number;
    mark(name: string): void;
    measure(name: string, startMark?: string, endMark?: string): void;
    getEntriesByName(name: string): any[];
    clearMarks(name?: string): void;
    clearMeasures(name?: string): void;
  };
}

declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(name: string, namespace: string): string;
  export function v5(name: string, namespace: string): string;
}

declare module 'js-yaml' {
  export function load(str: string, options?: any): any;
  export function dump(obj: any, options?: any): string;
  export function safeLoad(str: string, options?: any): any;
  export function safeDump(obj: any, options?: any): string;
}

declare module 'ws' {
  import { EventEmitter } from 'events';

  export interface WebSocketServer extends EventEmitter {
    on(event: 'connection', listener: (socket: WebSocket, request: any) => void): this;
    on(event: 'listening', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    close(callback?: () => void): void;
  }

  export interface WebSocket extends EventEmitter {
    on(event: 'message', listener: (data: Buffer) => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
    send(data: any): void;
    close(): void;
    readyState: number;
  }

  export class WebSocketServer {
    constructor(options: { port?: number; host?: string; server?: any });
  }

  export class WebSocket extends EventEmitter {
    constructor(url: string);
    static CONNECTING: number;
    static OPEN: number;
    static CLOSING: number;
    static CLOSED: number;
  }
}

declare module 'express' {
  import { IncomingMessage, ServerResponse } from 'http';

  export interface Request extends IncomingMessage {
    params: any;
    query: any;
    body: any;
    headers: any;
    method: string;
    path: string;
    url: string;
    ip: string;
    socket: any;
    user?: any;
    file?: any;
    get(field: string): string | undefined;
  }

  export interface Response extends ServerResponse {
    status(code: number): this;
    json(obj: any): this;
    send(data: any): this;
    set(field: string, value: string): this;
    cookie(name: string, value: string, options?: any): this;
    redirect(url: string): this;
    redirect(status: number, url: string): this;
    headersSent: boolean;
  }

  export interface NextFunction {
    (error?: any): void;
  }

  export interface RequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> {
    (req: Request, res: Response, next: NextFunction): void;
  }

  export interface Application {
    use(...args: any[]): this;
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    listen(port: number, callback?: () => void): any;
    json: any;
    urlencoded: any;
  }

  export interface Router {
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    use(...args: any[]): this;
  }

  export function Router(): Router;

  export interface Express extends Application {}

  function express(): Application;
  namespace express {
    export function json(options?: any): RequestHandler;
    export function urlencoded(options?: any): RequestHandler;
    export function Router(): Router;
  }
  export = express;
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any;
  }

  export interface SignOptions {
    algorithm?: string;
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    issuer?: string;
    jwtid?: string;
    subject?: string;
    noTimestamp?: boolean;
    header?: any;
    keyid?: string;
  }

  export function sign(payload: string | object | Buffer, secretOrPrivateKey: any, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: any, options?: any): any;
  export function decode(token: string, options?: any): any;
}

declare module 'cors' {
  import { RequestHandler } from 'express';

  interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  function cors(options?: CorsOptions): RequestHandler;
  export = cors;
}

declare module 'compression' {
  import { RequestHandler } from 'express';

  interface CompressionOptions {
    level?: number;
    threshold?: number | string;
    filter?: (req: any, res: any) => boolean;
  }

  function compression(options?: CompressionOptions): RequestHandler;
  export = compression;
}

declare module 'multer' {
  import { RequestHandler } from 'express';

  interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface Options {
    dest?: string;
    storage?: any;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    preservePath?: boolean;
    fileFilter?: (req: any, file: MulterFile, callback: (error: Error | null, acceptFile: boolean) => void) => void;
  }

  interface Multer {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: { name: string; maxCount?: number }[]): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
    memoryStorage(): any;
  }

  function multer(options?: Options): Multer;
  export = multer;
}

// React and JSX declarations
declare global {
  namespace JSX {
    type Element = any;
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface IntrinsicAttributes {
      key?: React.Key;
    }
    interface ElementClass {
      render(): any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicClassAttributes<T> {
      ref?: any;
    }
  }

  namespace React {
    type Key = string | number;
    interface Attributes {
      key?: Key;
      ref?: any;
    }
    interface KeyboardEvent<T = Element> {
      key: string;
      code: string;
      ctrlKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      metaKey: boolean;
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
    }

    interface FormEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
    }

    interface ChangeEvent<T = Element> {
      target: T & { value: string };
      preventDefault(): void;
      stopPropagation(): void;
    }

    interface MouseEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
      clientX: number;
      clientY: number;
      pageX: number;
      pageY: number;
      screenX: number;
      screenY: number;
      button: number;
      buttons: number;
      ctrlKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      metaKey: boolean;
    }

    interface DragEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
      relatedTarget?: T;
      dataTransfer: {
        files: FileList;
        getData(format: string): string;
        setData(format: string, data: string): void;
      };
    }
  }
}

// Browser timer functions (return number)
declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
declare function clearTimeout(timeoutId: number): void;
declare function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
declare function clearInterval(intervalId: number): void;

// Override React types to be more permissive
declare namespace React {
  type ReactElement<P = any, T = any> = {
    type: T;
    props: P;
    key: string | number | null;
  } | null;

  type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  type FC<P = {}> = (props: P) => ReactElement;
  type Component<P = {}, S = {}> = any;

  // Common component props
  interface ComponentProps<T = any> {
    children?: ReactNode;
    className?: string;
    [key: string]: any;
  }

  // Event types
  interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
    currentTarget: T;
  }

  interface ChangeEvent<T = Element> {
    target: T & { value: string };
    preventDefault(): void;
    stopPropagation(): void;
  }

  interface MouseEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
    currentTarget: T;
  }
}

declare module 'react' {
  type JSXElementConstructor<P> = ((props: P) => any) | (new (props: P) => Component<P, any>);

  namespace React {
    type ReactElement<P = any, T = any> = any;
    type ReactNode = any;

    // Event Handler Types
    type KeyboardEventHandler<T = Element> = (event: KeyboardEvent<T>) => void;
    type DragEventHandler<T = Element> = (event: DragEvent<T>) => void;
    type MouseEventHandler<T = Element> = (event: MouseEvent<T>) => void;
    type FormEventHandler<T = Element> = (event: FormEvent<T>) => void;
    type ChangeEventHandler<T = Element> = (event: ChangeEvent<T>) => void;

    class Component<P = {}, S = {}, SS = any> {
      constructor(props: P);
      props: Readonly<P>;
      state: Readonly<S>;
      setState(state: Partial<S> | ((prevState: Readonly<S>) => Partial<S> | null)): void;
      forceUpdate(callback?: () => void): void;
      render(): any;
    }

    interface ComponentClass<P = {}, S = {}> {
      new (props: P): Component<P, S>;
    }

    interface FunctionComponent<P = {}> {
      (props: P): any;
      displayName?: string;
    }
    type FC<P = {}> = FunctionComponent<P>;
    type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;

    interface RefObject<T> {
      readonly current: T | null;
    }

    function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void];
    function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    function useMemo<T>(factory: () => T, deps: any[]): T;
    function useRef<T = undefined>(): React.MutableRefObject<T | undefined>;
    function useRef<T>(initialValue: T): React.MutableRefObject<T>;
    function useRef<T>(initialValue: T | null): React.MutableRefObject<T | null>;
    function useRef<T = undefined>(initialValue: T | undefined): React.MutableRefObject<T | undefined>;
    function useImperativeHandle<T, R extends T>(
      ref: React.Ref<T> | undefined,
      init: () => R,
      deps?: any[]
    ): void;
    function useLayoutEffect(effect: () => void | (() => void), deps?: any[]): void;

    interface MutableRefObject<T> {
      current: T;
    }
    function createContext<T>(defaultValue: T): Context<T>;
    function useContext<T>(context: Context<T>): T;
    function useReducer<R extends Reducer<any, any>>(reducer: R, initialState: ReducerState<R>): [ReducerState<R>, Dispatch<ReducerAction<R>>];
    function forwardRef<T, P = {}>(render: (props: P, ref: React.Ref<T>) => ReactElement | null): FC<P & { ref?: React.Ref<T> }>;

    // Event interfaces
    interface KeyboardEvent<T = Element> {
      key: string;
      code: string;
      ctrlKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      metaKey: boolean;
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
    }

    interface FormEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
    }

    interface ChangeEvent<T = Element> {
      target: T & { value: string };
      preventDefault(): void;
      stopPropagation(): void;
    }

    interface MouseEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
      clientX: number;
      clientY: number;
      pageX: number;
      pageY: number;
      screenX: number;
      screenY: number;
      button: number;
      buttons: number;
      ctrlKey: boolean;
      shiftKey: boolean;
      altKey: boolean;
      metaKey: boolean;
    }

    interface DragEvent<T = Element> {
      preventDefault(): void;
      stopPropagation(): void;
      target: T;
      currentTarget: T;
      relatedTarget?: T;
      dataTransfer: {
        files: FileList;
        getData(format: string): string;
        setData(format: string, data: string): void;
      };
    }

    type RefCallback<T> = (instance: T | null) => void;
    type Ref<T> = RefObject<T> | RefCallback<T> | null;
    type ForwardedRef<T> = Ref<T>;

    interface Context<T> {
      Provider: FC<{ value: T; children?: ReactNode }>;
      Consumer: FC<{ children: (value: T) => ReactNode }>;
      displayName?: string;
    }

    type Reducer<S, A> = (prevState: S, action: A) => S;
    type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
    type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
    type Dispatch<A> = (value: A) => void;

    type FocusEvent<T = Element> = FormEvent<T>;
    type UIEvent<T = Element> = {
      target: T;
      currentTarget: T;
      preventDefault(): void;
      stopPropagation(): void;
    };

    interface HTMLAttributes<T> {
      className?: string;
      id?: string;
      style?: CSSProperties;
      onClick?: (event: any) => void;
      onChange?: (event: any) => void;
      onSubmit?: (event: any) => void;
      onKeyDown?: (event: any) => void;
      onKeyUp?: (event: any) => void;
      onKeyPress?: (event: any) => void;
      onDrop?: (event: any) => void;
      onDragOver?: (event: any) => void;
      onDragEnter?: (event: any) => void;
      onDragLeave?: (event: any) => void;
      children?: ReactNode;
      jsx?: boolean;
      [key: string]: any;
    }

    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
      type?: string;
      value?: string | number;
      placeholder?: string;
      disabled?: boolean;
      required?: boolean;
    }

    interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
      type?: 'button' | 'submit' | 'reset';
      disabled?: boolean;
    }

    interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
      jsx?: boolean;
      children?: ReactNode;
    }

    interface DetailedHTMLProps<E extends HTMLAttributes<T>, T> extends E {
      ref?: any;
    }
    type CSSProperties = Record<string, string | number>;
    const Fragment: FunctionComponent<{ children?: ReactNode }>;
    const StrictMode: FunctionComponent<{ children?: ReactNode }>;
    function memo<T extends FunctionComponent<any>>(component: T): T;
  }

  const React: {
    FC: typeof React.FunctionComponent;
    useState: typeof React.useState;
    useEffect: typeof React.useEffect;
    useCallback: typeof React.useCallback;
    useMemo: typeof React.useMemo;
    useRef: typeof React.useRef;
    useImperativeHandle: typeof React.useImperativeHandle;
    useLayoutEffect: typeof React.useLayoutEffect;
    createContext: typeof React.createContext;
    useContext: typeof React.useContext;
    useReducer: typeof React.useReducer;
    forwardRef: typeof React.forwardRef;
    memo: typeof React.memo;
    Fragment: React.FunctionComponent<{ children?: React.ReactNode }>;
    StrictMode: React.FunctionComponent<{ children?: React.ReactNode }>;
    Component: typeof React.Component;
  };

  export = React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: { children?: any }): any;
}

declare module 'react-dom' {
  import { ReactElement } from 'react';

  export function render(element: ReactElement, container: Element | null): void;
  export function unmountComponentAtNode(container: Element | null): boolean;
  export function findDOMNode(instance: any): Element | null;
  export function createPortal(children: ReactElement, container: Element): ReactElement;

  const ReactDOM: {
    render: typeof render;
    unmountComponentAtNode: typeof unmountComponentAtNode;
    findDOMNode: typeof findDOMNode;
    createPortal: typeof createPortal;
  };

  export default ReactDOM;
}

declare module 'react-router-dom' {
  import { ReactNode } from 'react';

  export interface BrowserRouterProps {
    children?: ReactNode;
  }

  export interface Location {
    pathname: string;
    search: string;
    hash: string;
    state?: unknown;
    key?: string;
  }

  export interface RouteProps {
    path?: string;
    element?: ReactNode;
    children?: ReactNode;
  }

  export interface RoutesProps {
    children?: ReactNode;
  }

  export function BrowserRouter(props: BrowserRouterProps): JSX.Element;
  export function Routes(props: RoutesProps): JSX.Element;
  export function Route(props: RouteProps): JSX.Element;
  export function Navigate(props: { to: string; replace?: boolean }): JSX.Element;
  export function useNavigate(): (path: string) => void;
  export function useParams<T = {}>(): T;
  export function useLocation(): Location;
  export function Link(props: { to: string; children?: ReactNode; className?: string }): JSX.Element;
}

declare module 'lucide-react' {
  import { FC } from 'react';

  interface IconProps {
    size?: number | string;
    color?: string;
    className?: string;
    strokeWidth?: number;
  }

  export const Settings: FC<IconProps>;
  export const User: FC<IconProps>;
  export const Brain: FC<IconProps>;
  export const MessageSquare: FC<IconProps>;
  export const FileText: FC<IconProps>;
  export const BookOpen: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Check: FC<IconProps>;
  export const Share: FC<IconProps>;
  export const Share2: FC<IconProps>;
  export const Scale: FC<IconProps>;
  export const Sparkles: FC<IconProps>;
  export const Laptop: FC<IconProps>;
  export const Smartphone: FC<IconProps>;
  export const HardDrive: FC<IconProps>;
  export const MemoryStick: FC<IconProps>;
  export const Gauge: FC<IconProps>;
  export const TrendingDown: FC<IconProps>;
  export const MoreHorizontal: FC<IconProps>;
  export const RotateCcw: FC<IconProps>;
  export const StopCircle: FC<IconProps>;
  export const Lock: FC<IconProps>;
  export const Unlock: FC<IconProps>;
  export const ShieldCheck: FC<IconProps>;
  export const ShieldAlert: FC<IconProps>;
  export const FileWarning: FC<IconProps>;
  export const FileCheck: FC<IconProps>;
  export const FileX: FC<IconProps>;
  export const Fingerprint: FC<IconProps>;
  export const Key: FC<IconProps>;
  export const UserX: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const BellOff: FC<IconProps>;
  export const Music: FC<IconProps>;
  export const Maximize2: FC<IconProps>;
  export const Minimize2: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const ChevronUp: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const Menu: FC<IconProps>;
  export const Home: FC<IconProps>;
  export const Book: FC<IconProps>;
  export const Zap: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const BarChart: FC<IconProps>;
  export const Activity: FC<IconProps>;
  export const Download: FC<IconProps>;
  export const Upload: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const EyeOff: FC<IconProps>;
  export const Edit: FC<IconProps>;
  export const Trash2: FC<IconProps>;
  export const Copy: FC<IconProps>;
  export const ExternalLink: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Cpu: FC<IconProps>;
  export const MessageCircle: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const AlertCircle: FC<IconProps>;
  export const XCircle: FC<IconProps>;
  export const Play: FC<IconProps>;
  export const Pause: FC<IconProps>;
  export const Stop: FC<IconProps>;
  export const Loader: FC<IconProps>;
  export const Refresh: FC<IconProps>;
  export const ArrowLeft: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const ArrowUp: FC<IconProps>;
  export const ArrowDown: FC<IconProps>;
  export const Pause: FC<IconProps>;
  export const Power: FC<IconProps>;
  export const Square: FC<IconProps>;
  export const Triangle: FC<IconProps>;
  export const Circle: FC<IconProps>;
  export const Star: FC<IconProps>;
  export const Heart: FC<IconProps>;
  export const Flag: FC<IconProps>;
  export const Bookmark: FC<IconProps>;
  export const Tag: FC<IconProps>;
  export const Filter: FC<IconProps>;
  export const Sort: FC<IconProps>;
  export const Grid: FC<IconProps>;
  export const List: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const Clock2: FC<IconProps>;
  export const Timer: FC<IconProps>;
  export const Save: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Minus: FC<IconProps>;
  export const Send: FC<IconProps>;
  export const Paperclip: FC<IconProps>;
  export const Smile: FC<IconProps>;
  export const MoreVertical: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  export const PieChart: FC<IconProps>;
  export const LineChart: FC<IconProps>;
  export const Grid3X3: FC<IconProps>;
  export const LayoutGrid: FC<IconProps>;
  export const Monitor: FC<IconProps>;
  export const Server: FC<IconProps>;
  export const Database: FC<IconProps>;
  export const Wifi: FC<IconProps>;
  export const WifiOff: FC<IconProps>;
  export const Signal: FC<IconProps>;
  export const SignalHigh: FC<IconProps>;
  export const SignalLow: FC<IconProps>;
  export const SignalMedium: FC<IconProps>;
  export const SignalZero: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const Info: FC<IconProps>;
  export const HelpCircle: FC<IconProps>;
  export const QuestionMarkCircleIcon: FC<IconProps>;
  export const Lightbulb: FC<IconProps>;
  export const Target: FC<IconProps>;
  export const Crosshair: FC<IconProps>;
  export const Focus: FC<IconProps>;
  export const Maximize: FC<IconProps>;
  export const Minimize: FC<IconProps>;
  export const Expand: FC<IconProps>;
  export const Shrink: FC<IconProps>;
  export const FullScreen: FC<IconProps>;
  export const ExitFullScreen: FC<IconProps>;
  export const Volume: FC<IconProps>;
  export const Volume1: FC<IconProps>;
  export const Volume2: FC<IconProps>;
  export const VolumeX: FC<IconProps>;
  export const Mic: FC<IconProps>;
  export const MicOff: FC<IconProps>;
  export const Video: FC<IconProps>;
  export const VideoOff: FC<IconProps>;
  export const Camera: FC<IconProps>;
  export const CameraOff: FC<IconProps>;
  export const Image: FC<IconProps>;
  export const ImageOff: FC<IconProps>;
  export const File: FC<IconProps>;
  export const FileText: FC<IconProps>;
  export const FileImage: FC<IconProps>;
  export const FileVideo: FC<IconProps>;
  export const FileAudio: FC<IconProps>;
  export const Folder: FC<IconProps>;
  export const FolderOpen: FC<IconProps>;
  export const Archive: FC<IconProps>;
  export const Package: FC<IconProps>;
  export const Box: FC<IconProps>;
  export const Container: FC<IconProps>;
  export const Layout: FC<IconProps>;
  export const Sidebar: FC<IconProps>;
  export const PanelLeft: FC<IconProps>;
  export const PanelRight: FC<IconProps>;
  export const PanelTop: FC<IconProps>;
  export const PanelBottom: FC<IconProps>;
  export const Columns: FC<IconProps>;
  export const Rows: FC<IconProps>;
  export const Table: FC<IconProps>;
  export const Board: FC<IconProps>;
  export const Kanban: FC<IconProps>;
  export const Card: FC<IconProps>;
  export const Window: FC<IconProps>;
  export const Tab: FC<IconProps>;
  export const Terminal: FC<IconProps>;
  export const Console: FC<IconProps>;
  export const Code: FC<IconProps>;
  export const Code2: FC<IconProps>;
  export const Binary: FC<IconProps>;
  export const Hash: FC<IconProps>;
  export const AtSign: FC<IconProps>;
  export const Percent: FC<IconProps>;
  export const Dollar: FC<IconProps>;
  export const Euro: FC<IconProps>;
  export const Pound: FC<IconProps>;
  export const Yen: FC<IconProps>;
  export const Bitcoin: FC<IconProps>;
  export const CreditCard: FC<IconProps>;
  export const Wallet: FC<IconProps>;
  export const Receipt: FC<IconProps>;
  export const ShoppingCart: FC<IconProps>;
  export const ShoppingBag: FC<IconProps>;
  export const Store: FC<IconProps>;
  export const Storefront: FC<IconProps>;
  export const Building: FC<IconProps>;
  export const Building2: FC<IconProps>;
  export const Factory: FC<IconProps>;
  export const Warehouse: FC<IconProps>;
  export const Hospital: FC<IconProps>;
  export const School: FC<IconProps>;
  export const University: FC<IconProps>;
  export const Library: FC<IconProps>;
  export const Bank: FC<IconProps>;
  export const Hotel: FC<IconProps>;
  export const Restaurant: FC<IconProps>;
  export const Car: FC<IconProps>;
  export const Bike: FC<IconProps>;
  export const Bus: FC<IconProps>;
  export const Train: FC<IconProps>;
  export const Plane: FC<IconProps>;
  export const Ship: FC<IconProps>;
  export const Truck: FC<IconProps>;
  export const Taxi: FC<IconProps>;
  export const ParkingCircle: FC<IconProps>;
  export const ParkingSquare: FC<IconProps>;
  export const GasStation: FC<IconProps>;
  export const Fuel: FC<IconProps>;
  export const Battery: FC<IconProps>;
  export const BatteryLow: FC<IconProps>;
  export const Plug: FC<IconProps>;
  export const Power: FC<IconProps>;
  export const PowerOff: FC<IconProps>;
  export const Zap: FC<IconProps>;
  export const Flash: FC<IconProps>;
  export const Sun: FC<IconProps>;
  export const Moon: FC<IconProps>;
  export const CloudRain: FC<IconProps>;
  export const CloudSnow: FC<IconProps>;
  export const CloudLightning: FC<IconProps>;
  export const Umbrella: FC<IconProps>;
  export const Thermometer: FC<IconProps>;
  export const Wind: FC<IconProps>;
  export const Compass: FC<IconProps>;
  export const Navigation: FC<IconProps>;
  export const Map: FC<IconProps>;
  export const MapPin: FC<IconProps>;
  export const Route: FC<IconProps>;
  export const Navigation2: FC<IconProps>;
  export const Locate: FC<IconProps>;
  export const LocateFixed: FC<IconProps>;
  export const LocateOff: FC<IconProps>;
  export const Globe: FC<IconProps>;
  export const Globe2: FC<IconProps>;
  export const Earth: FC<IconProps>;
  export const World: FC<IconProps>;
}

declare module 'helmet' {
  import { RequestHandler } from 'express';

  interface HelmetOptions {
    contentSecurityPolicy?: {
      directives?: {
        defaultSrc?: string[];
        styleSrc?: string[];
        scriptSrc?: string[];
        imgSrc?: string[];
        [key: string]: string[] | undefined;
      };
    };
  }

  function helmet(options?: HelmetOptions): RequestHandler;
  export = helmet;
}

declare module '@heroicons/react/24/outline' {
  import { FC } from 'react';

  interface IconProps {
    className?: string;
    'aria-hidden'?: boolean;
  }

  export const EyeIcon: FC<IconProps>;
  export const EyeSlashIcon: FC<IconProps>;
  export const PaperClipIcon: FC<IconProps>;
  export const FaceSmileIcon: FC<IconProps>;
  export const UserIcon: FC<IconProps>;
  export const ChatBubbleLeftRightIcon: FC<IconProps>;
  export const DocumentTextIcon: FC<IconProps>;
  export const MagnifyingGlassIcon: FC<IconProps>;
  export const Cog6ToothIcon: FC<IconProps>;
  export const BellIcon: FC<IconProps>;
  export const HomeIcon: FC<IconProps>;
  export const UsersIcon: FC<IconProps>;
  export const ChartBarIcon: FC<IconProps>;
  export const DocumentIcon: FC<IconProps>;
  export const FolderIcon: FC<IconProps>;
  export const ArchiveBoxIcon: FC<IconProps>;
  export const TrashIcon: FC<IconProps>;
  export const PencilIcon: FC<IconProps>;
  export const ShareIcon: FC<IconProps>;
  export const DownloadIcon: FC<IconProps>;
  export const CloudArrowUpIcon: FC<IconProps>;
  export const CloudArrowDownIcon: FC<IconProps>;
  export const ShieldCheckIcon: FC<IconProps>;
  export const ScaleIcon: FC<IconProps>;
  export const PaperAirplaneIcon: FC<IconProps>;
  export const PhotoIcon: FC<IconProps>;
  export const FilmIcon: FC<IconProps>;
  export const DocumentPlusIcon: FC<IconProps>;
  export const DocumentArrowUpIcon: FC<IconProps>;
  export const CheckIcon: FC<IconProps>;
  export const ClockIcon: FC<IconProps>;
  export const ExclamationCircleIcon: FC<IconProps>;
  export const BookOpenIcon: FC<IconProps>;
  export const ClipboardDocumentIcon: FC<IconProps>;
  export const MicrophoneIcon: FC<IconProps>;
  export const StopIcon: FC<IconProps>;
  export const PlayIcon: FC<IconProps>;
  export const PauseIcon: FC<IconProps>;
  export const SpeakerWaveIcon: FC<IconProps>;
  export const SpeakerXMarkIcon: FC<IconProps>;
  export const PencilSquareIcon: FC<IconProps>;
  export const CheckCircleIcon: FC<IconProps>;
  export const BanknotesIcon: FC<IconProps>;
  export const InformationCircleIcon: FC<IconProps>;
  export const XCircleIcon: FC<IconProps>;
  export const XMarkIcon: FC<IconProps>;
  export const CalendarIcon: FC<IconProps>;
  export const ArrowPathIcon: FC<IconProps>;
  export const BuildingOfficeIcon: FC<IconProps>;
  export const UserCircleIcon: FC<IconProps>;
  export const PhoneIcon: FC<IconProps>;
  export const AtSymbolIcon: FC<IconProps>;
  export const MapPinIcon: FC<IconProps>;
  export const GlobeAltIcon: FC<IconProps>;
  export const LinkIcon: FC<IconProps>;
  export const TagIcon: FC<IconProps>;
  export const StarIcon: FC<IconProps>;
  export const HeartIcon: FC<IconProps>;
  export const ChatBubbleBottomCenterTextIcon: FC<IconProps>;
  export const HandRaisedIcon: FC<IconProps>;
  export const CameraIcon: FC<IconProps>;
  export const VideoCameraIcon: FC<IconProps>;
  export const MicrophoneSlashIcon: FC<IconProps>;
  export const VideoCameraSlashIcon: FC<IconProps>;
  export const PhoneMissedCallIcon: FC<IconProps>;
  export const PhoneXMarkIcon: FC<IconProps>;
  export const Bars3Icon: FC<IconProps>;
  export const EllipsisHorizontalIcon: FC<IconProps>;
  export const ChevronDownIcon: FC<IconProps>;
  export const ChevronUpIcon: FC<IconProps>;
  export const ChevronLeftIcon: FC<IconProps>;
  export const ChevronRightIcon: FC<IconProps>;
  export const ChevronDoubleLeftIcon: FC<IconProps>;
  export const ChevronDoubleRightIcon: FC<IconProps>;
  export const ArrowLeftIcon: FC<IconProps>;
  export const ArrowRightIcon: FC<IconProps>;
  export const ArrowUpIcon: FC<IconProps>;
  export const ArrowDownIcon: FC<IconProps>;
  export const ArrowRightOnRectangleIcon: FC<IconProps>;
  export const PlusIcon: FC<IconProps>;
  export const MinusIcon: FC<IconProps>;
  export const Squares2X2Icon: FC<IconProps>;
  export const ListBulletIcon: FC<IconProps>;
  export const TableCellsIcon: FC<IconProps>;
  export const ViewColumnsIcon: FC<IconProps>;
  export const AdjustmentsHorizontalIcon: FC<IconProps>;
  export const FunnelIcon: FC<IconProps>;
  export const MagnifyingGlassPlusIcon: FC<IconProps>;
  export const MagnifyingGlassMinusIcon: FC<IconProps>;
  export const CloudIcon: FC<IconProps>;
  export const ServerIcon: FC<IconProps>;
  export const CircleStackIcon: FC<IconProps>;
  export const CpuChipIcon: FC<IconProps>;
  export const CommandLineIcon: FC<IconProps>;
  export const CodeBracketIcon: FC<IconProps>;
  export const CodeBracketSquareIcon: FC<IconProps>;
  export const WindowIcon: FC<IconProps>;
  export const ComputerDesktopIcon: FC<IconProps>;
  export const DevicePhoneMobileIcon: FC<IconProps>;
  export const DeviceTabletIcon: FC<IconProps>;
  export const PrinterIcon: FC<IconProps>;
  export const QrCodeIcon: FC<IconProps>;
  export const WifiIcon: FC<IconProps>;
  export const SignalIcon: FC<IconProps>;
  export const RssIcon: FC<IconProps>;
  export const RadioIcon: FC<IconProps>;
  export const TvIcon: FC<IconProps>;
  export const SpeakerWaveIcon: FC<IconProps>;
  export const MusicalNoteIcon: FC<IconProps>;
  export const PlayCircleIcon: FC<IconProps>;
  export const PauseCircleIcon: FC<IconProps>;
  export const StopCircleIcon: FC<IconProps>;
  export const ForwardIcon: FC<IconProps>;
  export const BackwardIcon: FC<IconProps>;
  export const SpeakerXMarkIcon: FC<IconProps>;
  export const AcademicCapIcon: FC<IconProps>;
  export const BeakerIcon: FC<IconProps>;
  export const BoltIcon: FC<IconProps>;
  export const BugAntIcon: FC<IconProps>;
  export const LightBulbIcon: FC<IconProps>;
  export const RocketLaunchIcon: FC<IconProps>;
  export const SparklesIcon: FC<IconProps>;
  export const CogIcon: FC<IconProps>;
  export const WrenchScrewdriverIcon: FC<IconProps>;
  export const KeyIcon: FC<IconProps>;
  export const LockClosedIcon: FC<IconProps>;
  export const LockOpenIcon: FC<IconProps>;
  export const ShieldExclamationIcon: FC<IconProps>;
  export const FingerPrintIcon: FC<IconProps>;
  export const IdentificationIcon: FC<IconProps>;
  export const EyeDropperIcon: FC<IconProps>;
  export const SwatchIcon: FC<IconProps>;
  export const PaintBrushIcon: FC<IconProps>;
  export const CursorArrowRaysIcon: FC<IconProps>;
  export const CursorArrowRippleIcon: FC<IconProps>;
  export const HandPointingLeftIcon: FC<IconProps>;
  export const HandPointingRightIcon: FC<IconProps>;
  export const HandPointingUpIcon: FC<IconProps>;
  export const HandPointingDownIcon: FC<IconProps>;
  export const ClipboardDocumentListIcon: FC<IconProps>;
  export const EllipsisVerticalIcon: FC<IconProps>;
  export const AdjustmentsVerticalIcon: FC<IconProps>;
  export const Bars4Icon: FC<IconProps>;
  export const Bars3BottomLeftIcon: FC<IconProps>;
  export const Bars3BottomRightIcon: FC<IconProps>;
  export const Bars3CenterLeftIcon: FC<IconProps>;
  export const SunIcon: FC<IconProps>;
  export const MoonIcon: FC<IconProps>;
  export const NewspaperIcon: FC<IconProps>;
  export const BookmarkIcon: FC<IconProps>;
  export const BookmarkSlashIcon: FC<IconProps>;
  export const FlagIcon: FC<IconProps>;
  export const ChatBubbleOvalLeftIcon: FC<IconProps>;
  export const ChatBubbleOvalLeftEllipsisIcon: FC<IconProps>;
  export const BellAlertIcon: FC<IconProps>;
  export const BellSlashIcon: FC<IconProps>;
  export const BellSnoozeIcon: FC<IconProps>;
  export const NoSymbolIcon: FC<IconProps>;
  export const PlusCircleIcon: FC<IconProps>;
  export const MinusCircleIcon: FC<IconProps>;
  export const PlayPauseIcon: FC<IconProps>;
  export const FastForwardIcon: FC<IconProps>;
  export const BackwardIcon: FC<IconProps>;
  export const SpeakerWaveIcon: FC<IconProps>;
  export const SpeakerXMarkIcon: FC<IconProps>;
  export const VolumeUpIcon: FC<IconProps>;
  export const VolumeOffIcon: FC<IconProps>;
}

// Missing modules
declare module 'zustand' {
  type StateCreator<T> = (set: (partial: Partial<T>) => void, get: () => T) => T;
  export function create<T>(stateCreator: StateCreator<T>): () => T;
}

declare module 'zustand/middleware' {
  export function subscribeWithSelector<T>(stateCreator: any): any;
  export function devtools<T>(stateCreator: any, options?: any): any;
}

declare module 'zustand/middleware/immer' {
  export function immer<T>(stateCreator: any): any;
}

declare module 'zustand/middleware/persist' {
  export function persist<T>(stateCreator: any, options: any): any;
}

declare module 'clsx' {
  export default function clsx(...args: any[]): string;
}

declare module 'tailwind-merge' {
  export function twMerge(...args: string[]): string;
}

declare module 'vitest' {
  export function expect(value: any): any;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function vi(): any;
}

declare module '@testing-library/react' {
  export function render(component: any, options?: any): any;
  export function screen(): any;
  export function fireEvent(): any;
  export function waitFor(fn: () => void | Promise<void>): Promise<void>;
}

declare module '@testing-library/user-event' {
  export default function userEvent(): any;
}

declare module 'recharts' {
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const Legend: any;
  export const ResponsiveContainer: any;
  export const BarChart: any;
  export const Bar: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const Area: any;
  export const AreaChart: any;
}

declare module '@components/ui' {
  export * from '../components/ui/Button';
  export * from '../components/ui/Card';
  export * from '../components/ui/Badge';
  export * from '../components/ui/Avatar';
  export * from '../components/ui/Input';
  export * from '../components/ui/MemoryUsageIndicator';
  export * from '../components/ui/Tabs';
}

declare module '@hooks/useMemoryMonitor' {
  export function useMemoryMonitor(): any;
}

declare module '@utils/systemResources' {
  export function getSystemResources(): any;
}

declare module '@utils/cn' {
  export function cn(...args: any[]): string;
}

declare module 'react-markdown' {
  import { FC } from 'react';
  interface ReactMarkdownProps {
    children: string;
    components?: any;
  }
  const ReactMarkdown: FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module 'react-syntax-highlighter' {
  import { FC } from 'react';
  interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    children: string;
    [key: string]: any;
  }
  export const Prism: FC<SyntaxHighlighterProps>;
  const SyntaxHighlighter: FC<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const tomorrow: any;
  export const vscDarkPlus: any;
  export const oneLight: any;
  export const oneDark: any;
}

// UI Component Library declarations
declare module '@/components/ui/card' {
  import { FC } from 'react';
  interface CardProps {
    className?: string;
    children?: any;
    [key: string]: any;
  }
  export const Card: FC<CardProps>;
  export const CardHeader: FC<CardProps>;
  export const CardContent: FC<CardProps>;
  export const CardTitle: FC<CardProps>;
  export const CardDescription: FC<CardProps>;
  export const CardFooter: FC<CardProps>;
}

declare module '@/components/ui/button' {
  import { FC } from 'react';
  interface ButtonProps {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'primary';
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
    className?: string;
    disabled?: boolean;
    onClick?: any;
    children?: any;
    type?: 'button' | 'submit' | 'reset';
    [key: string]: any;
  }
  export const Button: FC<ButtonProps>;
}

// Relative path declarations
declare module '../ui/Button' {
  export * from '@/components/ui/button';
}

declare module '../ui/Card' {
  export * from '@/components/ui/card';
}

declare module '../ui/Badge' {
  export * from '@/components/ui/badge';
}

declare module '../ui/Avatar' {
  export * from '@/components/ui/avatar';
}

declare module '../ui/Input' {
  export * from '@/components/ui/input';
}

declare module '../ui/Tabs' {
  export * from '@/components/ui/tabs';
}

// Jest and testing type definitions
declare namespace jest {
  interface Matchers<R> {
    toBe(expected: any): R;
    toEqual(expected: any): R;
    toBeNull(): R;
    toBeUndefined(): R;
    toBeDefined(): R;
    toBeTruthy(): R;
    toBeFalsy(): R;
    toContain(expected: any): R;
    toHaveBeenCalled(): R;
    toHaveBeenCalledWith(...args: any[]): R;
  }

  interface Mock {
    mockReturnValue(value: any): Mock;
    mockResolvedValue(value: any): Mock;
    mockRejectedValue(value: any): Mock;
    mockImplementation(fn: Function): Mock;
  }

  function fn(): Mock;
  function spyOn(object: any, method: string): Mock;
}

declare const jest: {
  fn(): jest.Mock;
  spyOn(object: any, method: string): jest.Mock;
};

declare function expect(value: any): jest.Matchers<any>;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;

// Superagent type definitions
declare module 'superagent' {
  interface Response {
    body: any;
    text: string;
    status: number;
    headers: any;
  }

  interface Request {
    send(data?: any): Request;
    query(data: any): Request;
    set(field: string, value: string): Request;
    set(headers: object): Request;
    type(contentType: string): Request;
    accept(contentType: string): Request;
    timeout(ms: number): Request;
    end(callback?: (err: any, res: Response) => void): void;
    then(onFulfilled?: (res: Response) => any, onRejected?: (err: any) => any): Promise<Response>;
  }

  function get(url: string): Request;
  function post(url: string): Request;
  function put(url: string): Request;
  function del(url: string): Request;
  function patch(url: string): Request;

  export = {
    get,
    post,
    put,
    del,
    patch
  };
}

declare module '@/components/ui/input' {
  import { FC } from 'react';
  interface InputProps {
    type?: string;
    placeholder?: string;
    value?: string | number;
    onChange?: any;
    className?: string;
    disabled?: boolean;
    [key: string]: any;
  }
  export const Input: FC<InputProps>;
}

declare module '@/components/ui/avatar' {
  import { FC } from 'react';
  interface AvatarProps {
    className?: string;
    children?: any;
    [key: string]: any;
  }
  export const Avatar: FC<AvatarProps>;
  export const AvatarImage: FC<AvatarProps>;
  export const AvatarFallback: FC<AvatarProps>;
}

declare module '@/components/ui/badge' {
  import { FC } from 'react';
  interface BadgeProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
    className?: string;
    children?: any;
    [key: string]: any;
  }
  export const Badge: FC<BadgeProps>;
}

declare module '@/components/ui/tabs' {
  import { FC } from 'react';
  interface TabsProps {
    defaultValue?: string;
    value?: string;
    onValueChange?: any;
    className?: string;
    children?: any;
    [key: string]: any;
  }
  export const Tabs: FC<TabsProps>;
  export const TabsList: FC<TabsProps>;
  export const TabsTrigger: FC<TabsProps>;
  export const TabsContent: FC<TabsProps>;
}