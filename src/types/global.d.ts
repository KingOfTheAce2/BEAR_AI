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
  function clearTimeout(timeoutId: Timeout): void;
  function setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): Timeout;
  function clearInterval(intervalId: Timeout): void;
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
    interface ElementClass {
      render(): any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}

// Override React types to be more permissive
declare namespace React {
  type ReactElement = any;
  type ReactNode = any;
  type FC<P = {}> = (props: P) => any;
  type Component<P = {}, S = {}> = any;

  // Event types
  interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
    currentTarget: T;
  }

  interface KeyboardEvent<T = Element> {
    key: string;
    code: string;
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
  type JSXElementConstructor<P> = ((props: P) => JSX.Element | null) | (new (props: P) => Component<P, any>);

  namespace React {
    type ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> = {
      type: T;
      props: P;
      key: string | number | null;
    };

    type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];

    interface Component<P = {}, S = {}, SS = any> {
      render(): ReactElement | null;
    }

    interface FunctionComponent<P = {}> {
      (props: P): ReactElement | null;
    }
    type FC<P = {}> = FunctionComponent<P>;

    function useState<S>(initialState: S | (() => S)): [S, (newState: S | ((prevState: S) => S)) => void];
    function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    function useMemo<T>(factory: () => T, deps: any[]): T;
    function useRef<T>(initialValue: T): { current: T };
    function useRef<T = undefined>(): { current: T | undefined };

    interface HTMLAttributes<T> {
      className?: string;
      id?: string;
      style?: any;
      onClick?: (event: any) => void;
      onChange?: (event: any) => void;
      onSubmit?: (event: any) => void;
      children?: ReactNode;
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
  }

  const React: {
    FC: typeof React.FunctionComponent;
    useState: typeof React.useState;
    useEffect: typeof React.useEffect;
    useCallback: typeof React.useCallback;
    useMemo: typeof React.useMemo;
    useRef: typeof React.useRef;
  };

  export = React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: { children?: any }): any;
}

declare module 'react-router-dom' {
  import { ReactNode } from 'react';

  export interface BrowserRouterProps {
    children?: ReactNode;
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
  export const Search: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Check: FC<IconProps>;
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
  export const MicrophoneIcon: FC<IconProps>;
  export const StopIcon: FC<IconProps>;
  export const PlayIcon: FC<IconProps>;
  export const PauseIcon: FC<IconProps>;
  export const SpeakerWaveIcon: FC<IconProps>;
  export const SpeakerXMarkIcon: FC<IconProps>;
}