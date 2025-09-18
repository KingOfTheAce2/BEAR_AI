
18s
Run npm run typecheck

> bear-ai-gui@1.0.0 typecheck
> tsc --noEmit

Error: src/components/agent/ConversationInterface.tsx(101,44): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
Error: src/components/chat/ChatInput.tsx(144,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is missing the following properties from type 'Element': attributes, classList, className, clientHeight, and 161 more.
Error: src/components/chat/LocalChatHistory.tsx(440,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/chat/OfflineChatInterface.tsx(319,17): error TS2322: Type '(e: React.KeyboardEvent<HTMLTextAreaElement>) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/@types/react/ts5.0/index").KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'import("react").KeyboardEvent<HTMLTextAreaElement>'.
Error: src/components/chat/OfflineChatInterface.tsx(355,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/chat/modern/FileUpload.tsx(188,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(189,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(190,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(191,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/MessageComponent.tsx(115,13): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/chat/modern/MessageInput.tsx(85,5): error TS2322: Type 'Timeout' is not assignable to type 'number'.
Error: src/components/chat/modern/MessageInput.tsx(318,11): error TS2322: Type '(e: React.KeyboardEvent<HTMLTextAreaElement>) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/@types/react/ts5.0/index").KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'import("react").KeyboardEvent<HTMLTextAreaElement>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is missing the following properties from type 'HTMLTextAreaElement': autocomplete, cols, defaultValue, dirName, and 311 more.
Error: src/components/chat/modern/MessageList.tsx(226,13): error TS2322: Type '(el: any) => void' is not assignable to type 'Ref<HTMLDivElement>'.
Error: src/components/common/Notification.tsx(3,14): error TS2305: Module '"../../utils/cn"' has no exported member 'animations'.
Error: src/components/common/NotificationCenter.tsx(5,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/dashboard/PerformanceMetrics.tsx(8,8): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/documents/DocumentCard.tsx(6,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowDownTrayIcon'. Did you mean 'ArrowDownIcon'?
Error: src/components/documents/DocumentUpload.tsx(180,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
      Types of property 'relatedTarget' are incompatible.
        Type 'EventTarget | null' is not assignable to type 'Element | undefined'.
          Type 'null' is not assignable to type 'Element | undefined'.
Error: src/components/documents/DocumentUpload.tsx(181,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/documents/DocumentUpload.tsx(182,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/enhanced/EnhancedButton.tsx(100,39): error TS2694: Namespace 'React' has no exported member 'RefObject'.
Error: src/components/enhanced/EnhancedButton.tsx(174,51): error TS2724: 'React' has no exported member named 'FocusEvent'. Did you mean 'MouseEvent'?
Error: src/components/enhanced/EnhancedButton.tsx(179,50): error TS2724: 'React' has no exported member named 'FocusEvent'. Did you mean 'MouseEvent'?
Error: src/components/enhanced/EnhancedButton.tsx(300,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "primary"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(304,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "secondary"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(308,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "outline"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(312,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "ghost"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(316,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "danger"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedNavigation.tsx(10,23): error TS2305: Module '"react-router-dom"' has no exported member 'useLocation'.
Error: src/components/enhanced/EnhancedNavigation.tsx(14,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChatBubbleLeftIcon'. Did you mean 'ChatBubbleOvalLeftIcon'?
Error: src/components/enhanced/EnhancedNavigation.tsx(22,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'UserGroupIcon'.
Error: src/components/enhanced/EnhancedNavigation.tsx(25,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'QuestionMarkCircleIcon'.
Error: src/components/enhanced/EnhancedNavigation.tsx(35,15): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(43,17): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(57,16): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(546,24): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/enhanced/EnhancedNavigation.tsx(557,25): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(9,28): error TS2305: Module '"react"' has no exported member 'ErrorInfo'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(28,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(58,43): error TS2689: Cannot extend an interface 'Component'. Did you mean 'implements'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(64,10): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(81,63): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(85,20): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(100,28): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(108,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(114,12): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(122,26): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(127,16): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(141,52): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(142,31): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(152,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(170,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(179,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(180,23): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(185,37): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(186,49): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(189,12): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(197,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(202,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(216,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(220,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(224,29): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(227,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(256,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(298,93): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(299,87): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(361,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(365,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(372,7): error TS2607: JSX element class does not support attributes because it does not have a 'props' property.
Error: src/components/error/ErrorBoundaryWrapper.tsx(372,8): error TS2786: 'ErrorBoundaryWrapper' cannot be used as a JSX component.
  Its instance type 'ErrorBoundaryWrapper' is not a valid JSX element.
    Type 'ErrorBoundaryWrapper' is missing the following properties from type 'ElementClass': context, setState, forceUpdate, props, and 2 more.
Error: src/components/error/ErrorFallbackComponent.tsx(10,42): error TS2305: Module '"lucide-react"' has no exported member 'Bug'.
Error: src/components/error/ErrorFallbackComponent.tsx(10,91): error TS2305: Module '"lucide-react"' has no exported member 'Mail'.
Error: src/components/error/index.ts(16,3): error TS2724: '"./ErrorBoundaryWrapper"' has no exported member named 'ErrorBoundaryWrapperProps'. Did you mean 'ErrorBoundaryWrapper'?
Error: src/components/error/index.ts(17,3): error TS2614: Module '"./ErrorBoundaryWrapper"' has no exported member 'ErrorFallbackProps'. Did you mean to use 'import ErrorFallbackProps from "./ErrorBoundaryWrapper"' instead?
Error: src/components/error/index.ts(27,111): error TS2307: Cannot find module '../../services/errorAnalytics' or its corresponding type declarations.
Error: src/components/error/index.ts(53,8): error TS2307: Cannot find module '../../services/errorAnalytics' or its corresponding type declarations.
Error: src/components/examples/MemoryMonitorExample.tsx(7,10): error TS2305: Module '"@components/ui"' has no exported member 'Card'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,16): error TS2305: Module '"@components/ui"' has no exported member 'CardHeader'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,28): error TS2305: Module '"@components/ui"' has no exported member 'CardTitle'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,39): error TS2305: Module '"@components/ui"' has no exported member 'CardContent'.
Error: src/components/examples/MemoryMonitorExample.tsx(8,10): error TS2305: Module '"@components/ui"' has no exported member 'MemoryUsageIndicator'.
Error: src/components/examples/MemoryMonitorExample.tsx(9,28): error TS2724: '"@hooks/useMemoryMonitor"' has no exported member named 'useSimpleMemoryMonitor'. Did you mean 'useMemoryMonitor'?
Error: src/components/examples/MemoryMonitorExample.tsx(9,52): error TS2305: Module '"@hooks/useMemoryMonitor"' has no exported member 'useMemoryAlerts'.
Error: src/components/examples/MemoryMonitorExample.tsx(10,10): error TS2305: Module '"@utils/systemResources"' has no exported member 'getSystemInfo'.
Error: src/components/examples/MemoryMonitorExample.tsx(11,10): error TS2305: Module '"@components/ui"' has no exported member 'Button'.
Error: src/components/examples/MemoryMonitorExample.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/examples/MemoryMonitorExample.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'Smartphone'.
Error: src/components/examples/MemoryMonitorExample.tsx(22,3): error TS2305: Module '"lucide-react"' has no exported member 'Laptop'.
Error: src/components/examples/MemoryMonitorExample.tsx(47,24): error TS2554: Expected 0 arguments, but got 1.
Error: src/components/files/DocumentViewer.tsx(185,17): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLInputElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLInputElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/files/DocumentViewer.tsx(246,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileBrowser.tsx(298,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileSearchIndex.tsx(339,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileUploadProcessor.tsx(261,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(262,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(263,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(264,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(385,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/LocalFileSystemIntegration.tsx(375,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/forms/Form.tsx(3,42): error TS2724: 'React' has no exported member named 'FormHTMLAttributes'. Did you mean 'HTMLAttributes'?
Error: src/components/forms/Form.tsx(6,6): error TS2339: Property 'className' does not exist on type 'FormProps'.
Error: src/components/gpu/GPUAccelerationProvider.tsx(10,8): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/gpu/GPUAccelerationProvider.tsx(231,45): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/gpu/GPUDashboard.tsx(3,28): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/index.ts(6,39): error TS2305: Module '"./ui/Card"' has no exported member 'CardDescription'.
Error: src/components/index.ts(6,69): error TS2305: Module '"./ui/Card"' has no exported member 'CardFooter'.
Error: src/components/index.ts(43,3): error TS2305: Module '"../types"' has no exported member 'AgentMetrics'.
Error: src/components/index.ts(47,3): error TS2305: Module '"../types"' has no exported member 'FormField'.
Error: src/components/index.ts(48,3): error TS2305: Module '"../types"' has no exported member 'ValidationRule'.
Error: src/components/index.ts(49,3): error TS2305: Module '"../types"' has no exported member 'Option'.
Error: src/components/index.ts(55,3): error TS2305: Module '"../types"' has no exported member 'ResponsiveBreakpoint'.
Error: src/components/index.ts(79,14): error TS2305: Module '"../utils/cn"' has no exported member 'responsive'.
Error: src/components/index.ts(79,26): error TS2305: Module '"../utils/cn"' has no exported member 'animations'.
Error: src/components/index.ts(79,38): error TS2305: Module '"../utils/cn"' has no exported member 'theme'.
Error: src/components/layout/Sidebar.tsx(10,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChevronDoubleLeftIcon'. Did you mean 'ChevronLeftIcon'?
Error: src/components/layout/Sidebar.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChevronDoubleRightIcon'. Did you mean 'ChevronRightIcon'?
Error: src/components/layout/StatusBar.tsx(8,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/layout/TopBar.tsx(10,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowRightOnRectangleIcon'.
Error: src/components/layout/UnifiedLayout.tsx(62,41): error TS2741: Property 'activeChat' is missing in type '{}' but required in type 'ChatInterfaceProps'.
Error: src/components/layout/UnifiedLayout.tsx(63,45): error TS2741: Property 'activeChat' is missing in type '{}' but required in type 'ChatInterfaceProps'.
Error: src/components/layout/UnifiedSidebar.tsx(2,23): error TS2305: Module '"react-router-dom"' has no exported member 'useLocation'.
Error: src/components/layout/UnifiedSidebar.tsx(6,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChatBubbleLeftIcon'. Did you mean 'ChatBubbleOvalLeftIcon'?
Error: src/components/layout/UnifiedSidebar.tsx(14,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'UserGroupIcon'.
Error: src/components/layout/UnifiedSidebar.tsx(17,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'QuestionMarkCircleIcon'.
Error: src/components/layout/UnifiedSidebar.tsx(32,15): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/layout/UnifiedStatusBar.tsx(38,12): error TS2678: Type '"insecure"' is not comparable to type '"error" | "secure" | "warning"'.
Error: src/components/layout/UnifiedTopBar.tsx(11,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowRightOnRectangleIcon'.
Error: src/components/legal/ContractAnalysisInterface.tsx(11,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/ContractAnalysisInterface.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/ContractAnalysisInterface.tsx(20,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(20,31): error TS2305: Module '"../../types/legal"' has no exported member 'RiskLevel'.
Error: src/components/legal/ContractAnalysisInterface.tsx(25,8): error TS2307: Cannot find module '../../services/legal/ContractAnalysisService' or its corresponding type declarations.
Error: src/components/legal/ContractAnalysisInterface.tsx(40,3): error TS2339: Property 'user' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(41,3): error TS2339: Property 'matter' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(42,3): error TS2339: Property 'client' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(45,3): error TS2339: Property 'className' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(7,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/DocumentDraftingInterface.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/DocumentDraftingInterface.tsx(13,3): error TS2305: Module '"lucide-react"' has no exported member 'Sparkles'.
Error: src/components/legal/DocumentDraftingInterface.tsx(20,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(20,31): error TS2724: '"../../types/legal"' has no exported member named 'LegalDocumentType'. Did you mean 'DocumentType'?
Error: src/components/legal/DocumentDraftingInterface.tsx(20,50): error TS2305: Module '"../../types/legal"' has no exported member 'LegalCategory'.
Error: src/components/legal/DocumentDraftingInterface.tsx(21,100): error TS2307: Cannot find module '../../services/legal/DocumentDraftingService' or its corresponding type declarations.
Error: src/components/legal/DocumentDraftingInterface.tsx(40,3): error TS2339: Property 'user' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(41,3): error TS2339: Property 'matter' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(42,3): error TS2339: Property 'client' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(47,3): error TS2339: Property 'className' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/LegalChatInterface.tsx(20,10): error TS2614: Module '"../chat/modern/TypingIndicator"' has no exported member 'TypingIndicator'. Did you mean to use 'import TypingIndicator from "../chat/modern/TypingIndicator"' instead?
Error: src/components/legal/LegalDashboard.tsx(3,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/LegalDashboard.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/legal/LegalDashboard.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/LegalDashboard.tsx(17,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/LegalDashboard.tsx(57,3): error TS2339: Property 'user' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(58,3): error TS2339: Property 'matter' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(59,3): error TS2339: Property 'client' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(63,3): error TS2339: Property 'className' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalInputArea.tsx(1,47): error TS2305: Module '"react"' has no exported member 'useImperativeHandle'.
Error: src/components/legal/LegalInputArea.tsx(297,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/legal/LegalMessageBubble.tsx(135,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"legal-query"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(136,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"case-law"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(137,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"statute"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(138,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"contract-review"' have no overlap.
Error: src/components/legal/LegalResearchInterface.tsx(4,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/LegalResearchInterface.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/LegalResearchInterface.tsx(18,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/LegalResearchInterface.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'History'.
Error: src/components/legal/LegalResearchInterface.tsx(24,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/LegalResearchInterface.tsx(24,31): error TS2305: Module '"../../types/legal"' has no exported member 'CaseLaw'.
Error: src/components/legal/LegalResearchInterface.tsx(24,40): error TS2305: Module '"../../types/legal"' has no exported member 'Statute'.
Error: src/components/legal/LegalResearchInterface.tsx(24,49): error TS2305: Module '"../../types/legal"' has no exported member 'Citation'.
Error: src/components/legal/LegalResearchInterface.tsx(25,34): error TS2307: Cannot find module '../../services/legal/LegalResearchService' or its corresponding type declarations.
Error: src/components/legal/LegalResearchInterface.tsx(54,3): error TS2339: Property 'user' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(55,3): error TS2339: Property 'matter' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(56,3): error TS2339: Property 'client' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(59,3): error TS2339: Property 'className' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/local/LocalChatInterface.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'StopCircle'.
Error: src/components/local/LocalChatInterface.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/local/LocalChatInterface.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalChatInterface.tsx(23,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalChatInterface.tsx(25,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(26,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(27,26): error TS2307: Cannot find module '../ui/textarea' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(28,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(29,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(30,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(309,23): error TS2345: Argument of type '(prev: ChatMessage[]) => (ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ....' is not assignable to parameter of type 'ChatMessage[] | ((prevState: ChatMessage[]) => ChatMessage[])'.
  Type '(prev: ChatMessage[]) => (ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ....' is not assignable to type '(prevState: ChatMessage[]) => ChatMessage[]'.
    Type '(ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?:...' is not assignable to type 'ChatMessage[]'.
      Type 'ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?: ...' is not assignable to type 'ChatMessage'.
        Type '{ content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?: string | undef...' is not assignable to type 'ChatMessage'.
          The types of 'metadata.storedLocally' are incompatible between these types.
            Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/components/local/LocalChatInterface.tsx(332,11): error TS18046: 'error' is of type 'unknown'.
Error: src/components/local/LocalFileBrowser.tsx(8,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalFileBrowser.tsx(12,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalFileBrowser.tsx(18,3): error TS2724: '"lucide-react"' has no exported member named 'Music'. Did you mean 'Mic'?
Error: src/components/local/LocalFileBrowser.tsx(26,3): error TS2305: Module '"lucide-react"' has no exported member 'FileWarning'.
Error: src/components/local/LocalFileBrowser.tsx(28,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(29,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(30,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(31,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(32,26): error TS2307: Cannot find module '../ui/checkbox' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(33,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(459,20): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/local/LocalFileBrowser.tsx(467,21): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/local/LocalFileBrowser.tsx(616,40): error TS18048: 'item.preview' is possibly 'undefined'.
Error: src/components/local/LocalFileBrowser.tsx(618,30): error TS18048: 'item.preview' is possibly 'undefined'.
Error: src/components/local/LocalModelSelector.tsx(2,28): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalModelSelector.tsx(2,44): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalModelSelector.tsx(3,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(4,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(5,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(6,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(7,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalPerformanceDashboard.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalPerformanceDashboard.tsx(10,3): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/local/LocalPerformanceDashboard.tsx(25,3): error TS2724: '"lucide-react"' has no exported member named 'Maximize2'. Did you mean 'Maximize'?
Error: src/components/local/LocalPerformanceDashboard.tsx(26,3): error TS2724: '"lucide-react"' has no exported member named 'Minimize2'. Did you mean 'Minimize'?
Error: src/components/local/LocalPerformanceDashboard.tsx(28,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(29,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(30,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(31,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(32,58): error TS2307: Cannot find module '../ui/tabs' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(33,24): error TS2307: Cannot find module '../ui/switch' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(34,23): error TS2307: Cannot find module '../ui/label' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(485,229): error TS2694: Namespace 'React' has no exported member 'CSSProperties'.
Error: src/components/local/LocalSettingsPanel.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalSettingsPanel.tsx(8,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalSettingsPanel.tsx(10,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalSettingsPanel.tsx(22,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/local/LocalSettingsPanel.tsx(23,3): error TS2305: Module '"lucide-react"' has no exported member 'BellOff'.
Error: src/components/local/LocalSettingsPanel.tsx(24,3): error TS2305: Module '"lucide-react"' has no exported member 'Palette'.
Error: src/components/local/LocalSettingsPanel.tsx(33,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/local/LocalSettingsPanel.tsx(35,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(36,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(37,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(38,23): error TS2307: Cannot find module '../ui/label' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(39,24): error TS2307: Cannot find module '../ui/switch' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(40,24): error TS2307: Cannot find module '../ui/slider' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(41,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(42,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(43,58): error TS2307: Cannot find module '../ui/tabs' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(44,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/OfflineErrorHandler.tsx(13,3): error TS2724: '"lucide-react"' has no exported member named 'FileX'. Did you mean 'File'?
Error: src/components/local/OfflineErrorHandler.tsx(16,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/OfflineErrorHandler.tsx(24,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(25,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(26,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(27,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(28,53): error TS2307: Cannot find module '../ui/alert' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(29,69): error TS2307: Cannot find module '../ui/collapsible' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(4,3): error TS2305: Module '"lucide-react"' has no exported member 'ShieldCheck'.
Error: src/components/local/PrivacyIndicators.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'ShieldAlert'.
Error: src/components/local/PrivacyIndicators.tsx(6,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/PrivacyIndicators.tsx(7,3): error TS2305: Module '"lucide-react"' has no exported member 'Unlock'.
Error: src/components/local/PrivacyIndicators.tsx(13,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/PrivacyIndicators.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'FileCheck'.
Error: src/components/local/PrivacyIndicators.tsx(15,3): error TS2724: '"lucide-react"' has no exported member named 'FileX'. Did you mean 'File'?
Error: src/components/local/PrivacyIndicators.tsx(20,3): error TS2305: Module '"lucide-react"' has no exported member 'Fingerprint'.
Error: src/components/local/PrivacyIndicators.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'Key'.
Error: src/components/local/PrivacyIndicators.tsx(22,3): error TS2724: '"lucide-react"' has no exported member named 'UserX'. Did you mean 'User'?
Error: src/components/local/PrivacyIndicators.tsx(32,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(33,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(34,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(35,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(36,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(37,74): error TS2307: Cannot find module '../ui/tooltip' or its corresponding type declarations.
Error: src/components/local/index.ts(37,8): error TS2307: Cannot find module '../types/localTypes' or its corresponding type declarations.
Error: src/components/local/index.ts(373,3): error TS18004: No value exists in scope for the shorthand property 'LocalModelSelector'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(374,3): error TS18004: No value exists in scope for the shorthand property 'LocalFileBrowser'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(375,3): error TS18004: No value exists in scope for the shorthand property 'LocalChatInterface'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(376,3): error TS18004: No value exists in scope for the shorthand property 'LocalSettingsPanel'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(377,3): error TS18004: No value exists in scope for the shorthand property 'OfflineErrorHandler'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(378,3): error TS18004: No value exists in scope for the shorthand property 'LocalPerformanceDashboard'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(379,3): error TS18004: No value exists in scope for the shorthand property 'PrivacyIndicators'. Either declare one or provide an initializer.
Error: src/components/model/ModelManager.tsx(13,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/ModelManager.tsx(94,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/model/ModelManager.tsx(281,40): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(14,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/huggingface/FineTuningInterface.tsx(16,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowUpTrayIcon'. Did you mean 'ArrowUpIcon'?
Error: src/components/model/huggingface/FineTuningInterface.tsx(68,11): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(68,37): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(70,18): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(138,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(139,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(140,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(141,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(245,7): error TS2322: Type '{ r?: number | undefined; alpha?: number | undefined; dropout?: number | undefined; targetModules?: string[] | undefined; }' is not assignable to type '{ r: number; alpha: number; dropout: number; targetModules: string[]; }'.
  Types of property 'r' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(781,9): error TS2322: Type '{ id: string; modelId: string; status: FineTuningStatus.RUNNING; method: FineTuningMethod.LORA; dataset: string; config: FineTuningConfig; progress: number; startTime: Date; retryCount: number; maxRetries: number; }' is not assignable to type 'FineTuningJob'.
  Object literal may only specify known properties, and 'retryCount' does not exist in type 'FineTuningJob'.
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowDownTrayIcon'. Did you mean 'ArrowDownIcon'?
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(15,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(28,3): error TS2305: Module '"../../../types/huggingface"' has no exported member 'CompatibilityResult'.
Error: src/components/model/huggingface/index.ts(11,47): error TS2307: Cannot find module '../../services/huggingface/HuggingFaceService' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(12,42): error TS2307: Cannot find module '../../services/huggingface/ModelSwitcher' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(13,46): error TS2307: Cannot find module '../../services/huggingface/LocalModelManager' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(16,46): error TS2307: Cannot find module '../../utils/huggingface/ModelBenchmarking' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(17,51): error TS2307: Cannot find module '../../utils/huggingface/CompatibilityValidator' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(18,52): error TS2307: Cannot find module '../../utils/huggingface/ErrorHandler' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(21,15): error TS2307: Cannot find module '../../types/huggingface' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(33,8): error TS2307: Cannot find module '../../types/huggingface' or its corresponding type declarations.
Error: src/components/monitoring/PerformanceDashboard.tsx(10,41): error TS2307: Cannot find module '../../services/monitoring/localPerformanceMonitor' or its corresponding type declarations.
Error: src/components/monitoring/PerformanceStats.tsx(3,41): error TS2307: Cannot find module '../../services/monitoring/localPerformanceMonitor' or its corresponding type declarations.
Error: src/components/pages/PerformancePage.tsx(6,38): error TS2307: Cannot find module '../../services/performanceOptimizer' or its corresponding type declarations.
Error: src/components/search/SearchResults.tsx(11,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowTopRightOnSquareIcon'.
Error: src/components/settings/ColorPicker.tsx(196,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/settings/SystemSettingsPanel.tsx(49,44): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(57,42): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(62,37): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(62,63): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(67,18): error TS2345: Argument of type '{ performance: { maxWorkerThreads: number; memoryLimit: number; gcSettings: { enabled: boolean; threshold: number; frequency: number; }; caching: { enabled: boolean; maxSize: number; ttl: number; }; preloading: { ...; }; }; }' is not assignable to parameter of type 'Partial<SystemSettings>'.
  The types of 'performance.preloading.aggressiveness' are incompatible between these types.
    Type 'string' is not assignable to type '"low" | "medium" | "high"'.
Error: src/components/settings/UserPreferencesPanel.tsx(21,32): error TS2339: Property 'supportedValuesOf' does not exist on type 'typeof Intl'.
Error: src/components/streaming/StreamingChat.tsx(216,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLInputElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLInputElement>' is not assignable to type 'KeyboardEvent<Element>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is not assignable to type 'Element'.
Error: src/components/ui/ErrorBoundary.tsx(1,28): error TS2305: Module '"react"' has no exported member 'ErrorInfo'.
Error: src/components/ui/ErrorBoundary.tsx(11,3): error TS2305: Module '"lucide-react"' has no exported member 'Bug'.
Error: src/components/ui/ErrorBoundary.tsx(16,3): error TS2305: Module '"lucide-react"' has no exported member 'Mail'.
Error: src/components/ui/ErrorBoundary.tsx(33,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/ui/ErrorBoundary.tsx(336,29): error TS2689: Cannot extend an interface 'Component'. Did you mean 'implements'?
Error: src/components/ui/ErrorBoundary.tsx(341,10): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(359,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(364,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(371,52): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(372,31): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(380,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(396,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(407,37): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(408,33): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(414,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(427,49): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(428,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/MemoryUsageIndicator.tsx(4,69): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/ui/MemoryUsageIndicator.tsx(5,121): error TS2307: Cannot find module '@utils/memoryMonitor' or its corresponding type declarations.
Error: src/components/ui/Modal.tsx(3,14): error TS2305: Module '"../../utils/cn"' has no exported member 'animations'.
Error: src/components/ui/ModelSelector.tsx(23,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/ui/ModelSelector.tsx(25,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/ModelSelector.tsx(30,3): error TS2305: Module '"lucide-react"' has no exported member 'MoreHorizontal'.
Error: src/components/ui/ModelSelector.tsx(52,11): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(167,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(185,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(463,68): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(466,61): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/NotificationSystem.tsx(26,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/ui/NotificationSystem.tsx(27,3): error TS2305: Module '"lucide-react"' has no exported member 'BellOff'.
Error: src/components/ui/OptimizationSuggestions.tsx(2,40): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/ui/OptimizationSuggestions.tsx(163,51): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.
Error: src/components/ui/PerformanceAlert.tsx(2,43): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/ui/PerformanceDashboard.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/ui/PerformanceDashboard.tsx(20,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/ui/PerformanceDashboard.tsx(25,3): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/ui/PerformanceDashboard.tsx(35,3): error TS2724: '"lucide-react"' has no exported member named 'Maximize2'. Did you mean 'Maximize'?
Error: src/components/ui/PerformanceDashboard.tsx(36,3): error TS2724: '"lucide-react"' has no exported member named 'Minimize2'. Did you mean 'Minimize'?
Error: src/components/ui/PerformanceDashboard.tsx(46,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/StreamingChatInterface.tsx(4,3): error TS2305: Module '"../../types/modelTypes"' has no exported member 'ChatSession'.
Error: src/components/ui/StreamingChatInterface.tsx(5,3): error TS2305: Module '"../../types/modelTypes"' has no exported member 'Message'.
Error: src/components/ui/StreamingChatInterface.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/ui/StreamingChatInterface.tsx(31,3): error TS2305: Module '"lucide-react"' has no exported member 'Share'.
Error: src/components/ui/StreamingChatInterface.tsx(33,3): error TS2305: Module '"lucide-react"' has no exported member 'MoreHorizontal'.
Error: src/components/ui/StreamingChatInterface.tsx(42,3): error TS2724: '"lucide-react"' has no exported member named 'Edit3'. Did you mean 'Edit'?
Error: src/components/ui/StreamingChatInterface.tsx(45,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/StreamingChatInterface.tsx(277,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(278,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(279,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(285,11): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/ui/VirtualScrollList.tsx(24,3): error TS2305: Module '"react"' has no exported member 'useLayoutEffect'.
Error: src/components/ui/VirtualScrollList.tsx(26,3): error TS2305: Module '"react"' has no exported member 'CSSProperties'.
Error: src/components/ui/VirtualScrollList.tsx(192,50): error TS2694: Namespace 'React' has no exported member 'UIEvent'.
Error: src/components/ui/VirtualScrollList.tsx(284,9): error TS2339: Property 'useImperativeHandle' does not exist on type 'typeof React'.
Error: src/components/ui/VirtualScrollList.tsx(438,12): error TS2339: Property 'memo' does not exist on type 'typeof React'.
Error: src/components/ui/index.ts(7,39): error TS2305: Module '"./Card"' has no exported member 'CardDescription'.
Error: src/components/ui/index.ts(7,69): error TS2305: Module '"./Card"' has no exported member 'CardFooter'.
Error: src/components/unified/ComponentFactory.tsx(6,17): error TS2305: Module '"react"' has no exported member 'memo'.
Error: src/components/unified/ComponentFactory.tsx(7,24): error TS2307: Cannot find module '../../utils/unified/logger' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(8,41): error TS2307: Cannot find module '../../utils/unified/errorHandler' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(9,20): error TS2307: Cannot find module '../../utils/unified/classNames' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(64,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(256,28): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(268,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(280,26): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(292,28): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(304,29): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(316,26): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(382,37): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(384,46): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(388,31): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(392,31): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/contexts/AppContext.tsx(2,30): error TS2305: Module '"../types"' has no exported member 'Chat'.
Error: src/contexts/PerformanceContext.tsx(9,8): error TS2307: Cannot find module '../services/performanceMonitor' or its corresponding type declarations.
Error: src/contexts/PerformanceContext.tsx(188,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/examples/HuggingFaceIntegrationExample.tsx(19,3): error TS2305: Module '"../components/model/huggingface"' has no exported member 'FineTuningConfig'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(252,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(253,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(254,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/StreamingExample.tsx(7,3): error TS2305: Module '"../components/streaming"' has no exported member 'useStreamingRecovery'.
Error: src/extensions/legal-processing-extension.ts(220,9): error TS2416: Property 'analyzeContract' in type 'BearLegalProcessingExtension' is not assignable to the same property in base type 'LegalDocumentPlugin'.
  Type '(content: string, options?: { jurisdiction?: string | undefined; contractType?: string | undefined; focusAreas?: string[] | undefined; } | undefined) => Promise<ContractAnalysis>' is not assignable to type '(content: string) => Promise<{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }>'.
    Type 'Promise<ContractAnalysis>' is not assignable to type 'Promise<{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }>'.
      Type 'ContractAnalysis' is not assignable to type '{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }'.
        Types of property 'keyTerms' are incompatible.
          Type '{ term: string; definition?: string | undefined; importance: "low" | "medium" | "high"; location: { section: string; paragraph: number; }; }[]' is not assignable to type 'string[]'.
            Type '{ term: string; definition?: string | undefined; importance: "low" | "medium" | "high"; location: { section: string; paragraph: number; }; }' is not assignable to type 'string'.
Error: src/extensions/legal-processing-extension.ts(264,9): error TS2740: Type 'ComplianceCheckResult' is missing the following properties from type '{ regulation: string; status: "compliant" | "non-compliant" | "requires-review" | "not-applicable"; details?: string | undefined; remediation?: string[] | undefined; }[]': length, pop, push, concat, and 29 more.
Error: src/extensions/legal-processing-extension.ts(770,42): error TS2769: No overload matches this call.
  Overload 1 of 3, '(callbackfn: (previousValue: 1 | 0 | 0.6 | 0.5, currentValue: 1 | 0 | 0.6 | 0.5, currentIndex: number, array: (1 | 0 | 0.6 | 0.5)[]) => 1 | 0 | 0.6 | 0.5, initialValue: 1 | 0 | 0.6 | 0.5): 1 | ... 2 more ... | 0.5', gave the following error.
    Type 'number' is not assignable to type '1 | 0 | 0.6 | 0.5'.
  Overload 2 of 3, '(callbackfn: (previousValue: 1 | 0 | 0.6 | 0.5, currentValue: 1 | 0 | 0.6 | 0.5, currentIndex: number, array: (1 | 0 | 0.6 | 0.5)[]) => 1 | 0 | 0.6 | 0.5, initialValue: 1 | 0 | 0.6 | 0.5): 1 | ... 2 more ... | 0.5', gave the following error.
    Type 'number' is not assignable to type '1 | 0 | 0.6 | 0.5'.
Error: src/extensions/plugin-architecture.ts(396,21): error TS2345: Argument of type '{ type: string; value: string; confidence: number; }' is not assignable to parameter of type 'never'.
Error: src/hooks/chat/useChat.ts(5,44): error TS2307: Cannot find module '../../services/chat/voice' or its corresponding type declarations.
Error: src/hooks/chat/useChat.ts(533,23): error TS2345: Argument of type '{ language: any; code: any; }' is not assignable to parameter of type 'never'.
Error: src/hooks/useClickOutside.ts(1,21): error TS2305: Module '"react"' has no exported member 'RefObject'.
Error: src/hooks/useMemoryMonitor.ts(10,8): error TS2307: Cannot find module '@utils/memoryMonitor' or its corresponding type declarations.
Error: src/hooks/useMemoryMonitor.ts(11,10): error TS2305: Module '"@utils/systemResources"' has no exported member 'getSystemInfo'.
Error: src/hooks/useMemoryMonitor.ts(11,25): error TS2305: Module '"@utils/systemResources"' has no exported member 'getOptimalConfig'.
Error: src/hooks/useModelManager.ts(13,3): error TS2724: '"../types/modelTypes"' has no exported member named 'ModelPerformanceMetrics'. Did you mean 'PerformanceMetrics'?
Error: src/hooks/useStreamingRecovery.ts(3,40): error TS2307: Cannot find module '../services/errorRecovery' or its corresponding type declarations.
Error: src/index.tsx(12,10): error TS2339: Property 'StrictMode' does not exist on type 'typeof React'.
Error: src/index.tsx(14,11): error TS2339: Property 'StrictMode' does not exist on type 'typeof React'.
Error: src/integrations/cross-platform-memory.ts(660,5): error TS2322: Type 'string' is not assignable to type 'Platform'.
Error: src/integrations/enhanced-local-inference.ts(457,5): error TS2322: Type 'AsyncGenerator<string, void, unknown>' is not assignable to type 'void'.
Error: src/integrations/llm-engine.ts(385,69): error TS2554: Expected 0 arguments, but got 1.
Error: src/integrations/memory-safety-system.ts(97,5): error TS2322: Type 'string' is not assignable to type 'Platform'.
Error: src/integrations/memory-safety-system.ts(127,21): error TS2769: No overload matches this call.
  Overload 1 of 3, '(timeout: string | number | Timeout | undefined): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'string | number | Timeout | undefined'.
      Type 'Timer' is missing the following properties from type 'Timeout': close, _onTimeout, [Symbol.dispose]
  Overload 2 of 3, '(intervalId: number): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'number'.
  Overload 3 of 3, '(id: number | undefined): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'number'.
Error: src/integrations/memory-safety-system.ts(432,66): error TS18046: 'error' is of type 'unknown'.
Error: src/integrations/memory-safety-system.ts(641,44): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(67,41): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(157,67): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(168,67): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(187,50): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(198,41): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(374,47): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(375,64): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(424,16): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(430,16): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/crypto/license.crypto.ts(60,30): error TS2554: Expected 3-4 arguments, but got 2.
Error: src/licensing/crypto/license.crypto.ts(96,27): error TS2551: Property 'createCipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createCipheriv'?
Error: src/licensing/crypto/license.crypto.ts(106,23): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(107,27): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(123,31): error TS2551: Property 'createDecipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createDecipheriv'?
Error: src/licensing/crypto/license.crypto.ts(142,54): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(143,21): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/licensing/crypto/license.crypto.ts(197,27): error TS2551: Property 'createCipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createCipheriv'?
Error: src/licensing/crypto/license.crypto.ts(208,30): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(221,31): error TS2551: Property 'createDecipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createDecipheriv'?
Error: src/licensing/frontend/components/LicenseActivation.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/licensing/frontend/components/LicenseActivation.tsx(13,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'DocumentDuplicateIcon'.
Error: src/licensing/frontend/components/LicenseStatus.tsx(9,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/licensing/utils/hardware.utils.ts(119,57): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/utils/hardware.utils.ts(141,50): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/utils/hardware.utils.ts(161,55): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(175,57): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(192,55): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(206,57): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(226,59): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(242,59): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(270,51): error TS2554: Expected 0 arguments, but got 1.
Error: src/plugins/api/APIProvider.ts(232,56): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(272,49): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(281,49): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(290,52): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(308,51): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(326,50): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(392,48): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(396,49): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(405,50): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(550,14): error TS2339: Property 'emit' does not exist on type 'BearAIAPI'.
Error: src/plugins/api/APIProvider.ts(594,47): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/core/ConfigManager.ts(238,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/core/PluginManager.ts(317,27): error TS2339: Property 'config' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(318,84): error TS2339: Property 'config' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(412,26): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(414,40): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(425,26): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(427,40): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/dev-tools/PluginDeveloper.ts(199,68): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/index.ts(264,28): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
Error: src/plugins/index.ts(269,29): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
Error: src/plugins/sandbox/IFrameSandbox.ts(66,59): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(35,61): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(81,43): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(156,16): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(166,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(182,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(240,59): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/SandboxManager.ts(284,31): error TS2345: Argument of type 'PluginPermission' is not assignable to parameter of type 'never'.
Error: src/plugins/sandbox/WebWorkerSandbox.ts(55,63): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/security/SecurityManager.ts(102,40): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/security/SecurityManager.ts(571,34): error TS2349: This expression is not callable.
  Each member of the union type '{ (callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: string[]) => string): string; (callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: string[]) => string, initialValue: string): string; <U>(callbackfn: (previousValue: U, currentValue: string, ...' has signatures, but none of those signatures are compatible with each other.
Error: src/reportWebVitals.ts(1,10): error TS2305: Module '"web-vitals"' has no exported member 'ReportHandler'.
Error: src/reportWebVitals.ts(5,34): error TS2339: Property 'getCLS' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,42): error TS2339: Property 'getFID' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,50): error TS2339: Property 'getFCP' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,58): error TS2339: Property 'getLCP' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,66): error TS2339: Property 'getTTFB' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/services/chat/storage.ts(195,31): error TS2345: Argument of type '{ messages: Message[]; id: string; title: string; participants: User[]; createdAt: Date; updatedAt: Date; isArchived: boolean; tags: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/chatIntegration.ts(14,11): error TS2367: This comparison appears to be unintentional because the types 'boolean' and 'string' have no overlap.
Error: src/services/chatIntegration.ts(35,44): error TS18046: 'error' is of type 'unknown'.
Error: src/services/chatSessions.ts(10,10): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/chatSessions.ts(10,23): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/configManager.ts(388,22): error TS2345: Argument of type '"config.imported"' is not assignable to parameter of type 'ConfigEventType'.
Error: src/services/configManager.ts(442,20): error TS2345: Argument of type '"config.reset"' is not assignable to parameter of type 'ConfigEventType'.
Error: src/services/environmentConfigLoader.ts(168,29): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(183,35): error TS2345: Argument of type '{ file: string; errors: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(187,33): error TS2345: Argument of type '{ file: string; errors: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(200,37): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(205,35): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(413,27): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/environmentConfigLoader.ts(416,26): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/environmentConfigLoader.ts(419,34): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/errorSystem.ts(11,108): error TS2307: Cannot find module './errorAnalytics' or its corresponding type declarations.
Error: src/services/fileMetadata.ts(85,11): error TS2322: Type '{ tags: never[]; categories: never[]; keywords: never[]; indexed: false; version: number; accessCount: number; lastAccessed: Date; searchCount: number; editCount: number; permissions: { read: true; write: true; delete: true; }; ... 29 more ...; duplicates?: string[] | undefined; }' is not assignable to type 'ExtendedFileMetadata'.
  Types of property 'id' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
Error: src/services/huggingface/HuggingFaceService.ts(396,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(398,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(558,23): error TS2345: Argument of type 'any' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(562,23): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/ModelSwitcher.ts(153,57): error TS2345: Argument of type 'Partial<ModelConfiguration>' is not assignable to parameter of type 'ModelConfiguration'.
  Types of property 'maxLength' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
Error: src/services/inference/batchProcessorConfig.ts(85,14): error TS2323: Cannot redeclare exported variable 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(146,54): error TS2339: Property 'promises' does not exist on type '{ default: typeof import("fs"); rename: typeof rename; renameSync(oldPath: PathLike, newPath: PathLike): void; truncate: typeof truncate; truncateSync(path: PathLike, len?: number | undefined): void; ... 95 more ...; constants: typeof constants; }'.
Error: src/services/inference/batchProcessorConfig.ts(182,14): error TS2323: Cannot redeclare exported variable 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(360,14): error TS2323: Cannot redeclare exported variable 'BatchConfigurationValidator'.
Error: src/services/inference/batchProcessorConfig.ts(426,3): error TS2323: Cannot redeclare exported variable 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(426,3): error TS2484: Export declaration conflicts with exported declaration of 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(427,3): error TS2323: Cannot redeclare exported variable 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(427,3): error TS2484: Export declaration conflicts with exported declaration of 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(428,3): error TS2323: Cannot redeclare exported variable 'BatchConfigurationValidator'.
Error: src/services/inference/batchProcessorConfig.ts(428,3): error TS2484: Export declaration conflicts with exported declaration of 'BatchConfigurationValidator'.
Error: src/services/inference/index.ts(8,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(9,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(10,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(12,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(13,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(14,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(15,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(16,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(25,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(26,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(27,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(28,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(32,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(33,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(34,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(35,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(36,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/localInferenceEngine.ts(248,22): error TS2304: Cannot find name 'this'.
Error: src/services/knowledge/analytics/AnalyticsService.ts(125,50): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/citations/CitationService.ts(111,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(21,11): error TS2564: Property 'documentIndexer' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(22,11): error TS2564: Property 'semanticSearch' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(23,11): error TS2564: Property 'knowledgeGraph' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(24,11): error TS2564: Property 'ragService' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(25,11): error TS2564: Property 'vectorDb' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(26,11): error TS2564: Property 'versioning' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(27,11): error TS2564: Property 'citations' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(28,11): error TS2564: Property 'analytics' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(98,50): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(127,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(155,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(173,41): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(182,49): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(304,45): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(223,30): error TS2339: Property 'value' does not exist on type 'IDBCursor'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(493,29): error TS2339: Property 'value' does not exist on type 'IDBCursor'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(538,44): error TS2345: Argument of type 'void' is not assignable to parameter of type 'IDBRequest<IDBCursor | null>'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(77,55): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(113,40): error TS2339: Property 'concepts' does not exist on type 'DocumentMetadata'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(152,40): error TS2339: Property 'entityMentions' does not exist on type 'DocumentMetadata'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(310,58): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(348,58): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(594,13): error TS2345: Argument of type 'Float32Array | undefined' is not assignable to parameter of type 'Float32Array'.
  Type 'undefined' is not assignable to type 'Float32Array'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(49,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(62,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(71,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(92,9): error TS2322: Type '{ wordCount: number; characterCount: number; readingTime: number; entityMentions: string[]; concepts: string[]; author?: string | undefined; subject?: string | undefined; keywords?: string[] | undefined; ... 4 more ...; relevance?: number | undefined; }' is not assignable to type 'DocumentMetadata'.
  Object literal may only specify known properties, and 'entityMentions' does not exist in type 'DocumentMetadata'.
Error: src/services/knowledge/indexing/EmbeddingService.ts(49,66): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/rag/RAGService.ts(66,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(68,41): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(92,49): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(204,34): error TS2345: Argument of type '{ options: { semantic: boolean; fuzzy?: boolean | undefined; exact?: boolean | undefined; includeSummary?: boolean | undefined; includeContext?: boolean | undefined; contextWindow?: number | undefined; rankingModel?: "bm25" | ... 2 more ... | undefined; }; text: string; filters?: SearchFilters | undefined; }' is not assignable to parameter of type 'SearchQuery'.
  The types of 'options.fuzzy' are incompatible between these types.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.
Error: src/services/knowledge/search/SemanticSearchService.ts(205,31): error TS2345: Argument of type '{ options: { exact: boolean; semantic?: boolean | undefined; fuzzy?: boolean | undefined; includeSummary?: boolean | undefined; includeContext?: boolean | undefined; contextWindow?: number | undefined; rankingModel?: "bm25" | ... 2 more ... | undefined; }; text: string; filters?: SearchFilters | undefined; }' is not assignable to parameter of type 'SearchQuery'.
  The types of 'options.semantic' are incompatible between these types.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/services/knowledge/versioning/DocumentVersioningService.ts(87,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/versioning/DocumentVersioningService.ts(371,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/legalChatService.ts(49,7): error TS2322: Type '{ id: string; title: string; messages: never[]; createdAt: Date; updatedAt: Date; tags: (PracticeArea | Jurisdiction)[]; category: string; practiceArea: PracticeArea; jurisdiction: Jurisdiction; clientMatter: string | undefined; confidentialityLevel: "confidential" | ... 2 more ... | "work-product"; }' is not assignable to type 'ChatSession'.
  Object literal may only specify known properties, and 'practiceArea' does not exist in type 'ChatSession'.
Error: src/services/legalChatService.ts(121,7): error TS2322: Type '"legal-query"' is not assignable to type '"system" | "text" | "document" | "analysis" | "citation" | "code" | "file" | "image"'.
Error: src/services/legalChatService.ts(172,65): error TS2345: Argument of type '{ temperature: number; maxTokens: number; }' is not assignable to parameter of type 'StreamingOptions'.
  Property 'stream' is missing in type '{ temperature: number; maxTokens: number; }' but required in type 'StreamingOptions'.
Error: src/services/legalChatService.ts(178,33): error TS2504: Type 'Promise<string>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator.
Error: src/services/legalChatService.ts(263,25): error TS18046: 'error' is of type 'unknown'.
Error: src/services/localFileSystem.ts(116,50): error TS2339: Property 'entries' does not exist on type 'FileSystemDirectoryHandle'.
Error: src/services/localFileSystem.ts(230,37): error TS2339: Property 'queryPermission' does not exist on type 'FileSystemFileHandle | FileSystemDirectoryHandle'.
  Property 'queryPermission' does not exist on type 'FileSystemFileHandle'.
Error: src/services/localFileSystem.ts(241,37): error TS2339: Property 'requestPermission' does not exist on type 'FileSystemFileHandle | FileSystemDirectoryHandle'.
  Property 'requestPermission' does not exist on type 'FileSystemFileHandle'.
Error: src/services/modelConfigManager.ts(8,3): error TS2305: Module '"../types/modelTypes"' has no exported member 'ModelConfiguration'.
Error: src/services/modelManager.ts(27,31): error TS2307: Cannot find module '../utils/memoryAwareLoader' or its corresponding type declarations.
Error: src/services/modelManager.ts(28,52): error TS2307: Cannot find module './gpt4allIntegration' or its corresponding type declarations.
Error: src/services/modelManager.ts(31,39): error TS2307: Cannot find module '../utils/modelCapabilitiesDetector' or its corresponding type declarations.
Error: src/services/modelManager.ts(33,39): error TS2307: Cannot find module '../utils/offlinePerformanceMonitor' or its corresponding type declarations.
Error: src/services/modelManager.ts(764,41): error TS18048: 'model.loadedAt' is possibly 'undefined'.
Error: src/services/modelManager.ts(1154,11): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/services/offlineSync.ts(168,7): error TS2322: Type '{ synced: boolean; lastSynced: Date; pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }' is not assignable to type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
  Object literal may only specify known properties, and 'synced' does not exist in type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
Error: src/services/offlineSync.ts(194,7): error TS2322: Type '{ synced: boolean; lastSynced: Date; pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }' is not assignable to type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
  Object literal may only specify known properties, and 'synced' does not exist in type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
Error: src/services/offlineSync.ts(237,9): error TS2345: Argument of type '{ path: any; movedFrom: any; lastModified: Date; }' is not assignable to parameter of type 'Partial<ExtendedFileMetadata>'.
  Object literal may only specify known properties, and 'movedFrom' does not exist in type 'Partial<ExtendedFileMetadata>'.
Error: src/services/settings/localSettingsService.ts(240,35): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/settings/localSettingsService.ts(366,33): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/settings/localSettingsService.ts(386,39): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/streamingManager.ts(2,59): error TS2307: Cannot find module './errorRecovery' or its corresponding type declarations.
Error: src/services/streamingService.ts(208,76): error TS18046: 'error' is of type 'unknown'.
Error: src/services/streamingService.ts(237,96): error TS18046: 'error' is of type 'unknown'.
Error: src/services/streamingService.ts(355,78): error TS18046: 'error' is of type 'unknown'.
Error: src/services/userSettings.ts(284,48): error TS2552: Cannot find name 'remgedSettings'. Did you mean 'remoteSettings'?
Error: src/services/userSettings.ts(363,30): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(376,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(388,30): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(395,26): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(413,48): error TS2322: Type 'Partial<{ highContrast: boolean; largeText: boolean; screenReader: boolean; keyboardNavigation: boolean; }>' is not assignable to type '{ highContrast: boolean; largeText: boolean; screenReader: boolean; keyboardNavigation: boolean; }'.
  Types of property 'highContrast' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/services/userSettings.ts(444,48): error TS2322: Type 'Partial<{ desktop: boolean; email: boolean; inApp: boolean; sound: boolean; }>' is not assignable to type '{ desktop: boolean; email: boolean; inApp: boolean; sound: boolean; }'.
  Types of property 'desktop' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/state/bear-store.ts(12,19): error TS2305: Module '"zustand/middleware/persist"' has no exported member 'createJSONStorage'.
Error: src/state/bear-store.ts(216,29): error TS2554: Expected 1 arguments, but got 0.
Error: src/state/bear-store.ts(217,3): error TS2554: Expected 0 arguments, but got 1.
Error: src/state/bear-store.ts(257,13): error TS18046: 'agent' is of type 'unknown'.
Error: src/state/bear-store.ts(257,43): error TS18046: 'agent' is of type 'unknown'.
Error: src/state/bear-store.ts(278,63): error TS18046: 'doc' is of type 'unknown'.
Error: src/state/bear-store.ts(310,60): error TS18046: 'task' is of type 'unknown'.
Error: src/state/bear-store.ts(368,62): error TS18046: 'model' is of type 'unknown'.
Error: src/state/bear-store.ts(518,36): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(524,63): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(629,29): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(653,32): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(654,35): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(655,31): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(656,32): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(657,28): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(658,34): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(662,17): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/unified/stateManager.tsx(7,38): error TS2307: Cannot find module '@/utils/unified/logger' or its corresponding type declarations.
Error: src/state/unified/stateManager.tsx(8,41): error TS2307: Cannot find module '@/utils/unified/errorHandler' or its corresponding type declarations.
Error: src/utils/chat/codeExecution.ts(180,7): error TS2531: Object is possibly 'null'.
Error: src/utils/chat/codeExecution.ts(181,7): error TS2531: Object is possibly 'null'.
Error: src/utils/cn.ts(1,15): error TS2614: Module '"clsx"' has no exported member 'ClassValue'. Did you mean to use 'import ClassValue from "clsx"' instead?
Error: src/utils/cn.ts(1,27): error TS2614: Module '"clsx"' has no exported member 'clsx'. Did you mean to use 'import clsx from "clsx"' instead?
Error: src/utils/huggingface/CompatibilityValidator.ts(244,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(259,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(274,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,26): error TS2339: Property 'compatibilityImprovement' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,55): error TS2339: Property 'estimatedCost' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,75): error TS2339: Property 'compatibilityImprovement' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,104): error TS2339: Property 'estimatedCost' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(281,19): error TS2339: Property 'component' does not exist on type 'never'.
Error: src/utils/localStorageBackup.ts(260,20): error TS18046: 'error' is of type 'unknown'.
Error: src/utils/localStorageBackup.ts(366,41): error TS18046: 'error' is of type 'unknown'.
Error: Process completed with exit code 2.
Run npm run typecheck

> bear-ai-gui@1.0.0 typecheck
> tsc --noEmit

Error: src/components/agent/ConversationInterface.tsx(101,44): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.
Error: src/components/chat/ChatInput.tsx(144,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is missing the following properties from type 'Element': attributes, classList, className, clientHeight, and 161 more.
Error: src/components/chat/LocalChatHistory.tsx(440,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/chat/OfflineChatInterface.tsx(319,17): error TS2322: Type '(e: React.KeyboardEvent<HTMLTextAreaElement>) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/@types/react/ts5.0/index").KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'import("react").KeyboardEvent<HTMLTextAreaElement>'.
Error: src/components/chat/OfflineChatInterface.tsx(355,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/chat/modern/FileUpload.tsx(188,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(189,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(190,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/FileUpload.tsx(191,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/chat/modern/MessageComponent.tsx(115,13): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/chat/modern/MessageInput.tsx(85,5): error TS2322: Type 'Timeout' is not assignable to type 'number'.
Error: src/components/chat/modern/MessageInput.tsx(318,11): error TS2322: Type '(e: React.KeyboardEvent<HTMLTextAreaElement>) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/@types/react/ts5.0/index").KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'import("react").KeyboardEvent<HTMLTextAreaElement>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is missing the following properties from type 'HTMLTextAreaElement': autocomplete, cols, defaultValue, dirName, and 311 more.
Error: src/components/chat/modern/MessageList.tsx(226,13): error TS2322: Type '(el: any) => void' is not assignable to type 'Ref<HTMLDivElement>'.
Error: src/components/common/Notification.tsx(3,14): error TS2305: Module '"../../utils/cn"' has no exported member 'animations'.
Error: src/components/common/NotificationCenter.tsx(5,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/dashboard/PerformanceMetrics.tsx(8,8): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/documents/DocumentCard.tsx(6,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowDownTrayIcon'. Did you mean 'ArrowDownIcon'?
Error: src/components/documents/DocumentUpload.tsx(180,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
      Types of property 'relatedTarget' are incompatible.
        Type 'EventTarget | null' is not assignable to type 'Element | undefined'.
          Type 'null' is not assignable to type 'Element | undefined'.
Error: src/components/documents/DocumentUpload.tsx(181,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/documents/DocumentUpload.tsx(182,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/enhanced/EnhancedButton.tsx(100,39): error TS2694: Namespace 'React' has no exported member 'RefObject'.
Error: src/components/enhanced/EnhancedButton.tsx(174,51): error TS2724: 'React' has no exported member named 'FocusEvent'. Did you mean 'MouseEvent'?
Error: src/components/enhanced/EnhancedButton.tsx(179,50): error TS2724: 'React' has no exported member named 'FocusEvent'. Did you mean 'MouseEvent'?
Error: src/components/enhanced/EnhancedButton.tsx(300,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "primary"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(304,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "secondary"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(308,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "outline"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(312,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "ghost"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedButton.tsx(316,20): error TS2741: Property 'children' is missing in type '{ ref: Ref<HTMLButtonElement>; variant: "danger"; }' but required in type 'EnhancedButtonProps'.
Error: src/components/enhanced/EnhancedNavigation.tsx(10,23): error TS2305: Module '"react-router-dom"' has no exported member 'useLocation'.
Error: src/components/enhanced/EnhancedNavigation.tsx(14,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChatBubbleLeftIcon'. Did you mean 'ChatBubbleOvalLeftIcon'?
Error: src/components/enhanced/EnhancedNavigation.tsx(22,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'UserGroupIcon'.
Error: src/components/enhanced/EnhancedNavigation.tsx(25,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'QuestionMarkCircleIcon'.
Error: src/components/enhanced/EnhancedNavigation.tsx(35,15): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(43,17): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(57,16): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/enhanced/EnhancedNavigation.tsx(546,24): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/enhanced/EnhancedNavigation.tsx(557,25): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(9,28): error TS2305: Module '"react"' has no exported member 'ErrorInfo'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(28,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(58,43): error TS2689: Cannot extend an interface 'Component'. Did you mean 'implements'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(64,10): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(81,63): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(85,20): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(100,28): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(108,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(114,12): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(122,26): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(127,16): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(141,52): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(142,31): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(152,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(170,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(179,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(180,23): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(185,37): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(186,49): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(189,12): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(197,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(202,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(216,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(220,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(224,29): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(227,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(256,12): error TS2339: Property 'setState' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(298,93): error TS2339: Property 'state' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(299,87): error TS2339: Property 'props' does not exist on type 'ErrorBoundaryWrapper'.
Error: src/components/error/ErrorBoundaryWrapper.tsx(361,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(365,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/error/ErrorBoundaryWrapper.tsx(372,7): error TS2607: JSX element class does not support attributes because it does not have a 'props' property.
Error: src/components/error/ErrorBoundaryWrapper.tsx(372,8): error TS2786: 'ErrorBoundaryWrapper' cannot be used as a JSX component.
  Its instance type 'ErrorBoundaryWrapper' is not a valid JSX element.
    Type 'ErrorBoundaryWrapper' is missing the following properties from type 'ElementClass': context, setState, forceUpdate, props, and 2 more.
Error: src/components/error/ErrorFallbackComponent.tsx(10,42): error TS2305: Module '"lucide-react"' has no exported member 'Bug'.
Error: src/components/error/ErrorFallbackComponent.tsx(10,91): error TS2305: Module '"lucide-react"' has no exported member 'Mail'.
Error: src/components/error/index.ts(16,3): error TS2724: '"./ErrorBoundaryWrapper"' has no exported member named 'ErrorBoundaryWrapperProps'. Did you mean 'ErrorBoundaryWrapper'?
Error: src/components/error/index.ts(17,3): error TS2614: Module '"./ErrorBoundaryWrapper"' has no exported member 'ErrorFallbackProps'. Did you mean to use 'import ErrorFallbackProps from "./ErrorBoundaryWrapper"' instead?
Error: src/components/error/index.ts(27,111): error TS2307: Cannot find module '../../services/errorAnalytics' or its corresponding type declarations.
Error: src/components/error/index.ts(53,8): error TS2307: Cannot find module '../../services/errorAnalytics' or its corresponding type declarations.
Error: src/components/examples/MemoryMonitorExample.tsx(7,10): error TS2305: Module '"@components/ui"' has no exported member 'Card'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,16): error TS2305: Module '"@components/ui"' has no exported member 'CardHeader'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,28): error TS2305: Module '"@components/ui"' has no exported member 'CardTitle'.
Error: src/components/examples/MemoryMonitorExample.tsx(7,39): error TS2305: Module '"@components/ui"' has no exported member 'CardContent'.
Error: src/components/examples/MemoryMonitorExample.tsx(8,10): error TS2305: Module '"@components/ui"' has no exported member 'MemoryUsageIndicator'.
Error: src/components/examples/MemoryMonitorExample.tsx(9,28): error TS2724: '"@hooks/useMemoryMonitor"' has no exported member named 'useSimpleMemoryMonitor'. Did you mean 'useMemoryMonitor'?
Error: src/components/examples/MemoryMonitorExample.tsx(9,52): error TS2305: Module '"@hooks/useMemoryMonitor"' has no exported member 'useMemoryAlerts'.
Error: src/components/examples/MemoryMonitorExample.tsx(10,10): error TS2305: Module '"@utils/systemResources"' has no exported member 'getSystemInfo'.
Error: src/components/examples/MemoryMonitorExample.tsx(11,10): error TS2305: Module '"@components/ui"' has no exported member 'Button'.
Error: src/components/examples/MemoryMonitorExample.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/examples/MemoryMonitorExample.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'Smartphone'.
Error: src/components/examples/MemoryMonitorExample.tsx(22,3): error TS2305: Module '"lucide-react"' has no exported member 'Laptop'.
Error: src/components/examples/MemoryMonitorExample.tsx(47,24): error TS2554: Expected 0 arguments, but got 1.
Error: src/components/files/DocumentViewer.tsx(185,17): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLInputElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLInputElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/files/DocumentViewer.tsx(246,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileBrowser.tsx(298,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileSearchIndex.tsx(339,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/FileUploadProcessor.tsx(261,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(262,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(263,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(264,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/files/FileUploadProcessor.tsx(385,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/files/LocalFileSystemIntegration.tsx(375,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/forms/Form.tsx(3,42): error TS2724: 'React' has no exported member named 'FormHTMLAttributes'. Did you mean 'HTMLAttributes'?
Error: src/components/forms/Form.tsx(6,6): error TS2339: Property 'className' does not exist on type 'FormProps'.
Error: src/components/gpu/GPUAccelerationProvider.tsx(10,8): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/gpu/GPUAccelerationProvider.tsx(231,45): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/gpu/GPUDashboard.tsx(3,28): error TS2307: Cannot find module '../../services/gpu' or its corresponding type declarations.
Error: src/components/index.ts(6,39): error TS2305: Module '"./ui/Card"' has no exported member 'CardDescription'.
Error: src/components/index.ts(6,69): error TS2305: Module '"./ui/Card"' has no exported member 'CardFooter'.
Error: src/components/index.ts(43,3): error TS2305: Module '"../types"' has no exported member 'AgentMetrics'.
Error: src/components/index.ts(47,3): error TS2305: Module '"../types"' has no exported member 'FormField'.
Error: src/components/index.ts(48,3): error TS2305: Module '"../types"' has no exported member 'ValidationRule'.
Error: src/components/index.ts(49,3): error TS2305: Module '"../types"' has no exported member 'Option'.
Error: src/components/index.ts(55,3): error TS2305: Module '"../types"' has no exported member 'ResponsiveBreakpoint'.
Error: src/components/index.ts(79,14): error TS2305: Module '"../utils/cn"' has no exported member 'responsive'.
Error: src/components/index.ts(79,26): error TS2305: Module '"../utils/cn"' has no exported member 'animations'.
Error: src/components/index.ts(79,38): error TS2305: Module '"../utils/cn"' has no exported member 'theme'.
Error: src/components/layout/Sidebar.tsx(10,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChevronDoubleLeftIcon'. Did you mean 'ChevronLeftIcon'?
Error: src/components/layout/Sidebar.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChevronDoubleRightIcon'. Did you mean 'ChevronRightIcon'?
Error: src/components/layout/StatusBar.tsx(8,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/layout/TopBar.tsx(10,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowRightOnRectangleIcon'.
Error: src/components/layout/UnifiedLayout.tsx(62,41): error TS2741: Property 'activeChat' is missing in type '{}' but required in type 'ChatInterfaceProps'.
Error: src/components/layout/UnifiedLayout.tsx(63,45): error TS2741: Property 'activeChat' is missing in type '{}' but required in type 'ChatInterfaceProps'.
Error: src/components/layout/UnifiedSidebar.tsx(2,23): error TS2305: Module '"react-router-dom"' has no exported member 'useLocation'.
Error: src/components/layout/UnifiedSidebar.tsx(6,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ChatBubbleLeftIcon'. Did you mean 'ChatBubbleOvalLeftIcon'?
Error: src/components/layout/UnifiedSidebar.tsx(14,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'UserGroupIcon'.
Error: src/components/layout/UnifiedSidebar.tsx(17,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'QuestionMarkCircleIcon'.
Error: src/components/layout/UnifiedSidebar.tsx(32,15): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/layout/UnifiedStatusBar.tsx(38,12): error TS2678: Type '"insecure"' is not comparable to type '"error" | "secure" | "warning"'.
Error: src/components/layout/UnifiedTopBar.tsx(11,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowRightOnRectangleIcon'.
Error: src/components/legal/ContractAnalysisInterface.tsx(11,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/ContractAnalysisInterface.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/ContractAnalysisInterface.tsx(20,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(20,31): error TS2305: Module '"../../types/legal"' has no exported member 'RiskLevel'.
Error: src/components/legal/ContractAnalysisInterface.tsx(25,8): error TS2307: Cannot find module '../../services/legal/ContractAnalysisService' or its corresponding type declarations.
Error: src/components/legal/ContractAnalysisInterface.tsx(40,3): error TS2339: Property 'user' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(41,3): error TS2339: Property 'matter' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(42,3): error TS2339: Property 'client' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/ContractAnalysisInterface.tsx(45,3): error TS2339: Property 'className' does not exist on type 'ContractAnalysisInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(7,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/DocumentDraftingInterface.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/DocumentDraftingInterface.tsx(13,3): error TS2305: Module '"lucide-react"' has no exported member 'Sparkles'.
Error: src/components/legal/DocumentDraftingInterface.tsx(20,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(20,31): error TS2724: '"../../types/legal"' has no exported member named 'LegalDocumentType'. Did you mean 'DocumentType'?
Error: src/components/legal/DocumentDraftingInterface.tsx(20,50): error TS2305: Module '"../../types/legal"' has no exported member 'LegalCategory'.
Error: src/components/legal/DocumentDraftingInterface.tsx(21,100): error TS2307: Cannot find module '../../services/legal/DocumentDraftingService' or its corresponding type declarations.
Error: src/components/legal/DocumentDraftingInterface.tsx(40,3): error TS2339: Property 'user' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(41,3): error TS2339: Property 'matter' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(42,3): error TS2339: Property 'client' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/DocumentDraftingInterface.tsx(47,3): error TS2339: Property 'className' does not exist on type 'DocumentDraftingInterfaceProps'.
Error: src/components/legal/LegalChatInterface.tsx(20,10): error TS2614: Module '"../chat/modern/TypingIndicator"' has no exported member 'TypingIndicator'. Did you mean to use 'import TypingIndicator from "../chat/modern/TypingIndicator"' instead?
Error: src/components/legal/LegalDashboard.tsx(3,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/LegalDashboard.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/legal/LegalDashboard.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/LegalDashboard.tsx(17,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/LegalDashboard.tsx(57,3): error TS2339: Property 'user' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(58,3): error TS2339: Property 'matter' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(59,3): error TS2339: Property 'client' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalDashboard.tsx(63,3): error TS2339: Property 'className' does not exist on type 'LegalDashboardProps'.
Error: src/components/legal/LegalInputArea.tsx(1,47): error TS2305: Module '"react"' has no exported member 'useImperativeHandle'.
Error: src/components/legal/LegalInputArea.tsx(297,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/legal/LegalMessageBubble.tsx(135,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"legal-query"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(136,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"case-law"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(137,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"statute"' have no overlap.
Error: src/components/legal/LegalMessageBubble.tsx(138,14): error TS2367: This comparison appears to be unintentional because the types '"system" | "document" | "analysis" | "citation" | "code" | "file" | "image"' and '"contract-review"' have no overlap.
Error: src/components/legal/LegalResearchInterface.tsx(4,3): error TS2305: Module '"lucide-react"' has no exported member 'BookOpen'.
Error: src/components/legal/LegalResearchInterface.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'Scale'.
Error: src/components/legal/LegalResearchInterface.tsx(18,3): error TS2305: Module '"lucide-react"' has no exported member 'Share2'.
Error: src/components/legal/LegalResearchInterface.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'History'.
Error: src/components/legal/LegalResearchInterface.tsx(24,10): error TS2305: Module '"../../types/legal"' has no exported member 'LegalComponentProps'.
Error: src/components/legal/LegalResearchInterface.tsx(24,31): error TS2305: Module '"../../types/legal"' has no exported member 'CaseLaw'.
Error: src/components/legal/LegalResearchInterface.tsx(24,40): error TS2305: Module '"../../types/legal"' has no exported member 'Statute'.
Error: src/components/legal/LegalResearchInterface.tsx(24,49): error TS2305: Module '"../../types/legal"' has no exported member 'Citation'.
Error: src/components/legal/LegalResearchInterface.tsx(25,34): error TS2307: Cannot find module '../../services/legal/LegalResearchService' or its corresponding type declarations.
Error: src/components/legal/LegalResearchInterface.tsx(54,3): error TS2339: Property 'user' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(55,3): error TS2339: Property 'matter' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(56,3): error TS2339: Property 'client' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/legal/LegalResearchInterface.tsx(59,3): error TS2339: Property 'className' does not exist on type 'LegalResearchInterfaceProps'.
Error: src/components/local/LocalChatInterface.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'StopCircle'.
Error: src/components/local/LocalChatInterface.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/local/LocalChatInterface.tsx(12,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalChatInterface.tsx(23,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalChatInterface.tsx(25,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(26,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(27,26): error TS2307: Cannot find module '../ui/textarea' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(28,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(29,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(30,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/LocalChatInterface.tsx(309,23): error TS2345: Argument of type '(prev: ChatMessage[]) => (ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ....' is not assignable to parameter of type 'ChatMessage[] | ((prevState: ChatMessage[]) => ChatMessage[])'.
  Type '(prev: ChatMessage[]) => (ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ....' is not assignable to type '(prevState: ChatMessage[]) => ChatMessage[]'.
    Type '(ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?:...' is not assignable to type 'ChatMessage[]'.
      Type 'ChatMessage | { content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?: ...' is not assignable to type 'ChatMessage'.
        Type '{ content: string; status: "completed"; isStreaming: false; metadata: { tokensUsed: number; responseTime: number; temperature: number; modelUsed?: string | undefined; attachments?: string[] | undefined; storedLocally?: boolean | undefined; encrypted?: boolean | undefined; }; ... 4 more ...; parentId?: string | undef...' is not assignable to type 'ChatMessage'.
          The types of 'metadata.storedLocally' are incompatible between these types.
            Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/components/local/LocalChatInterface.tsx(332,11): error TS18046: 'error' is of type 'unknown'.
Error: src/components/local/LocalFileBrowser.tsx(8,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalFileBrowser.tsx(12,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalFileBrowser.tsx(18,3): error TS2724: '"lucide-react"' has no exported member named 'Music'. Did you mean 'Mic'?
Error: src/components/local/LocalFileBrowser.tsx(26,3): error TS2305: Module '"lucide-react"' has no exported member 'FileWarning'.
Error: src/components/local/LocalFileBrowser.tsx(28,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(29,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(30,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(31,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(32,26): error TS2307: Cannot find module '../ui/checkbox' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(33,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalFileBrowser.tsx(459,20): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/local/LocalFileBrowser.tsx(467,21): error TS2339: Property 'Fragment' does not exist on type 'typeof React'.
Error: src/components/local/LocalFileBrowser.tsx(616,40): error TS18048: 'item.preview' is possibly 'undefined'.
Error: src/components/local/LocalFileBrowser.tsx(618,30): error TS18048: 'item.preview' is possibly 'undefined'.
Error: src/components/local/LocalModelSelector.tsx(2,28): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalModelSelector.tsx(2,44): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalModelSelector.tsx(3,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(4,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(5,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(6,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalModelSelector.tsx(7,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalPerformanceDashboard.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalPerformanceDashboard.tsx(10,3): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/local/LocalPerformanceDashboard.tsx(25,3): error TS2724: '"lucide-react"' has no exported member named 'Maximize2'. Did you mean 'Maximize'?
Error: src/components/local/LocalPerformanceDashboard.tsx(26,3): error TS2724: '"lucide-react"' has no exported member named 'Minimize2'. Did you mean 'Minimize'?
Error: src/components/local/LocalPerformanceDashboard.tsx(28,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(29,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(30,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(31,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(32,58): error TS2307: Cannot find module '../ui/tabs' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(33,24): error TS2307: Cannot find module '../ui/switch' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(34,23): error TS2307: Cannot find module '../ui/label' or its corresponding type declarations.
Error: src/components/local/LocalPerformanceDashboard.tsx(485,229): error TS2694: Namespace 'React' has no exported member 'CSSProperties'.
Error: src/components/local/LocalSettingsPanel.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/LocalSettingsPanel.tsx(8,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/LocalSettingsPanel.tsx(10,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/LocalSettingsPanel.tsx(22,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/local/LocalSettingsPanel.tsx(23,3): error TS2305: Module '"lucide-react"' has no exported member 'BellOff'.
Error: src/components/local/LocalSettingsPanel.tsx(24,3): error TS2305: Module '"lucide-react"' has no exported member 'Palette'.
Error: src/components/local/LocalSettingsPanel.tsx(33,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/local/LocalSettingsPanel.tsx(35,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(36,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(37,23): error TS2307: Cannot find module '../ui/input' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(38,23): error TS2307: Cannot find module '../ui/label' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(39,24): error TS2307: Cannot find module '../ui/switch' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(40,24): error TS2307: Cannot find module '../ui/slider' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(41,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(42,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(43,58): error TS2307: Cannot find module '../ui/tabs' or its corresponding type declarations.
Error: src/components/local/LocalSettingsPanel.tsx(44,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(6,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/OfflineErrorHandler.tsx(13,3): error TS2724: '"lucide-react"' has no exported member named 'FileX'. Did you mean 'File'?
Error: src/components/local/OfflineErrorHandler.tsx(16,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/local/OfflineErrorHandler.tsx(24,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(25,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(26,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(27,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(28,53): error TS2307: Cannot find module '../ui/alert' or its corresponding type declarations.
Error: src/components/local/OfflineErrorHandler.tsx(29,69): error TS2307: Cannot find module '../ui/collapsible' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(4,3): error TS2305: Module '"lucide-react"' has no exported member 'ShieldCheck'.
Error: src/components/local/PrivacyIndicators.tsx(5,3): error TS2305: Module '"lucide-react"' has no exported member 'ShieldAlert'.
Error: src/components/local/PrivacyIndicators.tsx(6,3): error TS2724: '"lucide-react"' has no exported member named 'Lock'. Did you mean 'Clock'?
Error: src/components/local/PrivacyIndicators.tsx(7,3): error TS2305: Module '"lucide-react"' has no exported member 'Unlock'.
Error: src/components/local/PrivacyIndicators.tsx(13,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/local/PrivacyIndicators.tsx(14,3): error TS2305: Module '"lucide-react"' has no exported member 'FileCheck'.
Error: src/components/local/PrivacyIndicators.tsx(15,3): error TS2724: '"lucide-react"' has no exported member named 'FileX'. Did you mean 'File'?
Error: src/components/local/PrivacyIndicators.tsx(20,3): error TS2305: Module '"lucide-react"' has no exported member 'Fingerprint'.
Error: src/components/local/PrivacyIndicators.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'Key'.
Error: src/components/local/PrivacyIndicators.tsx(22,3): error TS2724: '"lucide-react"' has no exported member named 'UserX'. Did you mean 'User'?
Error: src/components/local/PrivacyIndicators.tsx(32,58): error TS2307: Cannot find module '../ui/card' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(33,23): error TS2307: Cannot find module '../ui/badge' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(34,24): error TS2307: Cannot find module '../ui/button' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(35,26): error TS2307: Cannot find module '../ui/progress' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(36,27): error TS2307: Cannot find module '../ui/separator' or its corresponding type declarations.
Error: src/components/local/PrivacyIndicators.tsx(37,74): error TS2307: Cannot find module '../ui/tooltip' or its corresponding type declarations.
Error: src/components/local/index.ts(37,8): error TS2307: Cannot find module '../types/localTypes' or its corresponding type declarations.
Error: src/components/local/index.ts(373,3): error TS18004: No value exists in scope for the shorthand property 'LocalModelSelector'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(374,3): error TS18004: No value exists in scope for the shorthand property 'LocalFileBrowser'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(375,3): error TS18004: No value exists in scope for the shorthand property 'LocalChatInterface'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(376,3): error TS18004: No value exists in scope for the shorthand property 'LocalSettingsPanel'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(377,3): error TS18004: No value exists in scope for the shorthand property 'OfflineErrorHandler'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(378,3): error TS18004: No value exists in scope for the shorthand property 'LocalPerformanceDashboard'. Either declare one or provide an initializer.
Error: src/components/local/index.ts(379,3): error TS18004: No value exists in scope for the shorthand property 'PrivacyIndicators'. Either declare one or provide an initializer.
Error: src/components/model/ModelManager.tsx(13,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/ModelManager.tsx(94,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/model/ModelManager.tsx(281,40): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(14,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/huggingface/FineTuningInterface.tsx(16,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowUpTrayIcon'. Did you mean 'ArrowUpIcon'?
Error: src/components/model/huggingface/FineTuningInterface.tsx(68,11): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(68,37): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(70,18): error TS2339: Property 'type' does not exist on type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(138,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(139,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(140,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(141,11): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(245,7): error TS2322: Type '{ r?: number | undefined; alpha?: number | undefined; dropout?: number | undefined; targetModules?: string[] | undefined; }' is not assignable to type '{ r: number; alpha: number; dropout: number; targetModules: string[]; }'.
  Types of property 'r' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
Error: src/components/model/huggingface/FineTuningInterface.tsx(781,9): error TS2322: Type '{ id: string; modelId: string; status: FineTuningStatus.RUNNING; method: FineTuningMethod.LORA; dataset: string; config: FineTuningConfig; progress: number; startTime: Date; retryCount: number; maxRetries: number; }' is not assignable to type 'FineTuningJob'.
  Object literal may only specify known properties, and 'retryCount' does not exist in type 'FineTuningJob'.
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ArrowDownTrayIcon'. Did you mean 'ArrowDownIcon'?
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(15,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/components/model/huggingface/HuggingFaceModelSelector.tsx(28,3): error TS2305: Module '"../../../types/huggingface"' has no exported member 'CompatibilityResult'.
Error: src/components/model/huggingface/index.ts(11,47): error TS2307: Cannot find module '../../services/huggingface/HuggingFaceService' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(12,42): error TS2307: Cannot find module '../../services/huggingface/ModelSwitcher' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(13,46): error TS2307: Cannot find module '../../services/huggingface/LocalModelManager' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(16,46): error TS2307: Cannot find module '../../utils/huggingface/ModelBenchmarking' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(17,51): error TS2307: Cannot find module '../../utils/huggingface/CompatibilityValidator' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(18,52): error TS2307: Cannot find module '../../utils/huggingface/ErrorHandler' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(21,15): error TS2307: Cannot find module '../../types/huggingface' or its corresponding type declarations.
Error: src/components/model/huggingface/index.ts(33,8): error TS2307: Cannot find module '../../types/huggingface' or its corresponding type declarations.
Error: src/components/monitoring/PerformanceDashboard.tsx(10,41): error TS2307: Cannot find module '../../services/monitoring/localPerformanceMonitor' or its corresponding type declarations.
Error: src/components/monitoring/PerformanceStats.tsx(3,41): error TS2307: Cannot find module '../../services/monitoring/localPerformanceMonitor' or its corresponding type declarations.
Error: src/components/pages/PerformancePage.tsx(6,38): error TS2307: Cannot find module '../../services/performanceOptimizer' or its corresponding type declarations.
Error: src/components/search/SearchResults.tsx(11,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'ArrowTopRightOnSquareIcon'.
Error: src/components/settings/ColorPicker.tsx(196,14): error TS2322: Type '{ children: string; jsx: true; }' is not assignable to type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
  Property 'jsx' does not exist on type 'DetailedHTMLProps<StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>'.
Error: src/components/settings/SystemSettingsPanel.tsx(49,44): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(57,42): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(62,37): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(62,63): error TS2339: Property 'deviceMemory' does not exist on type 'Navigator'.
Error: src/components/settings/SystemSettingsPanel.tsx(67,18): error TS2345: Argument of type '{ performance: { maxWorkerThreads: number; memoryLimit: number; gcSettings: { enabled: boolean; threshold: number; frequency: number; }; caching: { enabled: boolean; maxSize: number; ttl: number; }; preloading: { ...; }; }; }' is not assignable to parameter of type 'Partial<SystemSettings>'.
  The types of 'performance.preloading.aggressiveness' are incompatible between these types.
    Type 'string' is not assignable to type '"low" | "medium" | "high"'.
Error: src/components/settings/UserPreferencesPanel.tsx(21,32): error TS2339: Property 'supportedValuesOf' does not exist on type 'typeof Intl'.
Error: src/components/streaming/StreamingChat.tsx(216,15): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLInputElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLInputElement>' is not assignable to type 'KeyboardEvent<Element>'.
      Types of property 'target' are incompatible.
        Type 'EventTarget' is not assignable to type 'Element'.
Error: src/components/ui/ErrorBoundary.tsx(1,28): error TS2305: Module '"react"' has no exported member 'ErrorInfo'.
Error: src/components/ui/ErrorBoundary.tsx(11,3): error TS2305: Module '"lucide-react"' has no exported member 'Bug'.
Error: src/components/ui/ErrorBoundary.tsx(16,3): error TS2305: Module '"lucide-react"' has no exported member 'Mail'.
Error: src/components/ui/ErrorBoundary.tsx(33,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/ui/ErrorBoundary.tsx(336,29): error TS2689: Cannot extend an interface 'Component'. Did you mean 'implements'?
Error: src/components/ui/ErrorBoundary.tsx(341,10): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(359,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(364,10): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(371,52): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(372,31): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(380,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(396,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(407,37): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(408,33): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(414,10): error TS2339: Property 'setState' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(427,49): error TS2339: Property 'state' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/ErrorBoundary.tsx(428,71): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
Error: src/components/ui/MemoryUsageIndicator.tsx(4,69): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/ui/MemoryUsageIndicator.tsx(5,121): error TS2307: Cannot find module '@utils/memoryMonitor' or its corresponding type declarations.
Error: src/components/ui/Modal.tsx(3,14): error TS2305: Module '"../../utils/cn"' has no exported member 'animations'.
Error: src/components/ui/ModelSelector.tsx(23,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/ui/ModelSelector.tsx(25,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/ModelSelector.tsx(30,3): error TS2305: Module '"lucide-react"' has no exported member 'MoreHorizontal'.
Error: src/components/ui/ModelSelector.tsx(52,11): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(167,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(185,34): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(463,68): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/ModelSelector.tsx(466,61): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/components/ui/NotificationSystem.tsx(26,3): error TS2305: Module '"lucide-react"' has no exported member 'Bell'.
Error: src/components/ui/NotificationSystem.tsx(27,3): error TS2305: Module '"lucide-react"' has no exported member 'BellOff'.
Error: src/components/ui/OptimizationSuggestions.tsx(2,40): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/ui/OptimizationSuggestions.tsx(163,51): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.
Error: src/components/ui/PerformanceAlert.tsx(2,43): error TS2307: Cannot find module '../../services/performanceMonitor' or its corresponding type declarations.
Error: src/components/ui/PerformanceDashboard.tsx(19,3): error TS2305: Module '"lucide-react"' has no exported member 'HardDrive'.
Error: src/components/ui/PerformanceDashboard.tsx(20,3): error TS2305: Module '"lucide-react"' has no exported member 'MemoryStick'.
Error: src/components/ui/PerformanceDashboard.tsx(25,3): error TS2305: Module '"lucide-react"' has no exported member 'TrendingDown'.
Error: src/components/ui/PerformanceDashboard.tsx(35,3): error TS2724: '"lucide-react"' has no exported member named 'Maximize2'. Did you mean 'Maximize'?
Error: src/components/ui/PerformanceDashboard.tsx(36,3): error TS2724: '"lucide-react"' has no exported member named 'Minimize2'. Did you mean 'Minimize'?
Error: src/components/ui/PerformanceDashboard.tsx(46,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/StreamingChatInterface.tsx(4,3): error TS2305: Module '"../../types/modelTypes"' has no exported member 'ChatSession'.
Error: src/components/ui/StreamingChatInterface.tsx(5,3): error TS2305: Module '"../../types/modelTypes"' has no exported member 'Message'.
Error: src/components/ui/StreamingChatInterface.tsx(21,3): error TS2305: Module '"lucide-react"' has no exported member 'RotateCcw'.
Error: src/components/ui/StreamingChatInterface.tsx(31,3): error TS2305: Module '"lucide-react"' has no exported member 'Share'.
Error: src/components/ui/StreamingChatInterface.tsx(33,3): error TS2305: Module '"lucide-react"' has no exported member 'MoreHorizontal'.
Error: src/components/ui/StreamingChatInterface.tsx(42,3): error TS2724: '"lucide-react"' has no exported member named 'Edit3'. Did you mean 'Edit'?
Error: src/components/ui/StreamingChatInterface.tsx(45,3): error TS2305: Module '"lucide-react"' has no exported member 'Gauge'.
Error: src/components/ui/StreamingChatInterface.tsx(277,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(278,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(279,9): error TS2322: Type '(e: React.DragEvent) => void' is not assignable to type 'DragEventHandler<HTMLDivElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'DragEvent<HTMLDivElement>' is not assignable to type 'DragEvent<Element>'.
Error: src/components/ui/StreamingChatInterface.tsx(285,11): error TS2322: Type '(e: React.KeyboardEvent) => void' is not assignable to type 'KeyboardEventHandler<HTMLTextAreaElement>'.
  Types of parameters 'e' and 'event' are incompatible.
    Type 'KeyboardEvent<HTMLTextAreaElement>' is not assignable to type 'KeyboardEvent<Element>'.
Error: src/components/ui/VirtualScrollList.tsx(24,3): error TS2305: Module '"react"' has no exported member 'useLayoutEffect'.
Error: src/components/ui/VirtualScrollList.tsx(26,3): error TS2305: Module '"react"' has no exported member 'CSSProperties'.
Error: src/components/ui/VirtualScrollList.tsx(192,50): error TS2694: Namespace 'React' has no exported member 'UIEvent'.
Error: src/components/ui/VirtualScrollList.tsx(284,9): error TS2339: Property 'useImperativeHandle' does not exist on type 'typeof React'.
Error: src/components/ui/VirtualScrollList.tsx(438,12): error TS2339: Property 'memo' does not exist on type 'typeof React'.
Error: src/components/ui/index.ts(7,39): error TS2305: Module '"./Card"' has no exported member 'CardDescription'.
Error: src/components/ui/index.ts(7,69): error TS2305: Module '"./Card"' has no exported member 'CardFooter'.
Error: src/components/unified/ComponentFactory.tsx(6,17): error TS2305: Module '"react"' has no exported member 'memo'.
Error: src/components/unified/ComponentFactory.tsx(7,24): error TS2307: Cannot find module '../../utils/unified/logger' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(8,41): error TS2307: Cannot find module '../../utils/unified/errorHandler' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(9,20): error TS2307: Cannot find module '../../utils/unified/classNames' or its corresponding type declarations.
Error: src/components/unified/ComponentFactory.tsx(64,20): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(256,28): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(268,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(280,26): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(292,28): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(304,29): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(316,26): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(382,37): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(384,46): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(388,31): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/components/unified/ComponentFactory.tsx(392,31): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/contexts/AppContext.tsx(2,30): error TS2305: Module '"../types"' has no exported member 'Chat'.
Error: src/contexts/PerformanceContext.tsx(9,8): error TS2307: Cannot find module '../services/performanceMonitor' or its corresponding type declarations.
Error: src/contexts/PerformanceContext.tsx(188,27): error TS2724: 'React' has no exported member named 'ComponentType'. Did you mean 'Component'?
Error: src/examples/HuggingFaceIntegrationExample.tsx(19,3): error TS2305: Module '"../components/model/huggingface"' has no exported member 'FineTuningConfig'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(252,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(253,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/HuggingFaceIntegrationExample.tsx(254,9): error TS1362: 'LegalCategory' cannot be used as a value because it was exported using 'export type'.
Error: src/examples/StreamingExample.tsx(7,3): error TS2305: Module '"../components/streaming"' has no exported member 'useStreamingRecovery'.
Error: src/extensions/legal-processing-extension.ts(220,9): error TS2416: Property 'analyzeContract' in type 'BearLegalProcessingExtension' is not assignable to the same property in base type 'LegalDocumentPlugin'.
  Type '(content: string, options?: { jurisdiction?: string | undefined; contractType?: string | undefined; focusAreas?: string[] | undefined; } | undefined) => Promise<ContractAnalysis>' is not assignable to type '(content: string) => Promise<{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }>'.
    Type 'Promise<ContractAnalysis>' is not assignable to type 'Promise<{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }>'.
      Type 'ContractAnalysis' is not assignable to type '{ keyTerms: string[]; obligations: { party: string; obligation: string; }[]; risks: string[]; recommendations: string[]; }'.
        Types of property 'keyTerms' are incompatible.
          Type '{ term: string; definition?: string | undefined; importance: "low" | "medium" | "high"; location: { section: string; paragraph: number; }; }[]' is not assignable to type 'string[]'.
            Type '{ term: string; definition?: string | undefined; importance: "low" | "medium" | "high"; location: { section: string; paragraph: number; }; }' is not assignable to type 'string'.
Error: src/extensions/legal-processing-extension.ts(264,9): error TS2740: Type 'ComplianceCheckResult' is missing the following properties from type '{ regulation: string; status: "compliant" | "non-compliant" | "requires-review" | "not-applicable"; details?: string | undefined; remediation?: string[] | undefined; }[]': length, pop, push, concat, and 29 more.
Error: src/extensions/legal-processing-extension.ts(770,42): error TS2769: No overload matches this call.
  Overload 1 of 3, '(callbackfn: (previousValue: 1 | 0 | 0.6 | 0.5, currentValue: 1 | 0 | 0.6 | 0.5, currentIndex: number, array: (1 | 0 | 0.6 | 0.5)[]) => 1 | 0 | 0.6 | 0.5, initialValue: 1 | 0 | 0.6 | 0.5): 1 | ... 2 more ... | 0.5', gave the following error.
    Type 'number' is not assignable to type '1 | 0 | 0.6 | 0.5'.
  Overload 2 of 3, '(callbackfn: (previousValue: 1 | 0 | 0.6 | 0.5, currentValue: 1 | 0 | 0.6 | 0.5, currentIndex: number, array: (1 | 0 | 0.6 | 0.5)[]) => 1 | 0 | 0.6 | 0.5, initialValue: 1 | 0 | 0.6 | 0.5): 1 | ... 2 more ... | 0.5', gave the following error.
    Type 'number' is not assignable to type '1 | 0 | 0.6 | 0.5'.
Error: src/extensions/plugin-architecture.ts(396,21): error TS2345: Argument of type '{ type: string; value: string; confidence: number; }' is not assignable to parameter of type 'never'.
Error: src/hooks/chat/useChat.ts(5,44): error TS2307: Cannot find module '../../services/chat/voice' or its corresponding type declarations.
Error: src/hooks/chat/useChat.ts(533,23): error TS2345: Argument of type '{ language: any; code: any; }' is not assignable to parameter of type 'never'.
Error: src/hooks/useClickOutside.ts(1,21): error TS2305: Module '"react"' has no exported member 'RefObject'.
Error: src/hooks/useMemoryMonitor.ts(10,8): error TS2307: Cannot find module '@utils/memoryMonitor' or its corresponding type declarations.
Error: src/hooks/useMemoryMonitor.ts(11,10): error TS2305: Module '"@utils/systemResources"' has no exported member 'getSystemInfo'.
Error: src/hooks/useMemoryMonitor.ts(11,25): error TS2305: Module '"@utils/systemResources"' has no exported member 'getOptimalConfig'.
Error: src/hooks/useModelManager.ts(13,3): error TS2724: '"../types/modelTypes"' has no exported member named 'ModelPerformanceMetrics'. Did you mean 'PerformanceMetrics'?
Error: src/hooks/useStreamingRecovery.ts(3,40): error TS2307: Cannot find module '../services/errorRecovery' or its corresponding type declarations.
Error: src/index.tsx(12,10): error TS2339: Property 'StrictMode' does not exist on type 'typeof React'.
Error: src/index.tsx(14,11): error TS2339: Property 'StrictMode' does not exist on type 'typeof React'.
Error: src/integrations/cross-platform-memory.ts(660,5): error TS2322: Type 'string' is not assignable to type 'Platform'.
Error: src/integrations/enhanced-local-inference.ts(457,5): error TS2322: Type 'AsyncGenerator<string, void, unknown>' is not assignable to type 'void'.
Error: src/integrations/llm-engine.ts(385,69): error TS2554: Expected 0 arguments, but got 1.
Error: src/integrations/memory-safety-system.ts(97,5): error TS2322: Type 'string' is not assignable to type 'Platform'.
Error: src/integrations/memory-safety-system.ts(127,21): error TS2769: No overload matches this call.
  Overload 1 of 3, '(timeout: string | number | Timeout | undefined): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'string | number | Timeout | undefined'.
      Type 'Timer' is missing the following properties from type 'Timeout': close, _onTimeout, [Symbol.dispose]
  Overload 2 of 3, '(intervalId: number): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'number'.
  Overload 3 of 3, '(id: number | undefined): void', gave the following error.
    Argument of type 'Timer' is not assignable to parameter of type 'number'.
Error: src/integrations/memory-safety-system.ts(432,66): error TS18046: 'error' is of type 'unknown'.
Error: src/integrations/memory-safety-system.ts(641,44): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(67,41): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(157,67): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(168,67): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(187,50): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(198,41): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/licensing/backend/license.manager.ts(374,47): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(375,64): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(424,16): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/backend/license.manager.ts(430,16): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/crypto/license.crypto.ts(60,30): error TS2554: Expected 3-4 arguments, but got 2.
Error: src/licensing/crypto/license.crypto.ts(96,27): error TS2551: Property 'createCipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createCipheriv'?
Error: src/licensing/crypto/license.crypto.ts(106,23): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(107,27): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(123,31): error TS2551: Property 'createDecipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createDecipheriv'?
Error: src/licensing/crypto/license.crypto.ts(142,54): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(143,21): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/licensing/crypto/license.crypto.ts(197,27): error TS2551: Property 'createCipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createCipheriv'?
Error: src/licensing/crypto/license.crypto.ts(208,30): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/crypto/license.crypto.ts(221,31): error TS2551: Property 'createDecipher' does not exist on type 'typeof import("crypto")'. Did you mean 'createDecipheriv'?
Error: src/licensing/frontend/components/LicenseActivation.tsx(11,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/licensing/frontend/components/LicenseActivation.tsx(13,3): error TS2305: Module '"@heroicons/react/24/outline"' has no exported member 'DocumentDuplicateIcon'.
Error: src/licensing/frontend/components/LicenseStatus.tsx(9,3): error TS2724: '"@heroicons/react/24/outline"' has no exported member named 'ExclamationTriangleIcon'. Did you mean 'ExclamationCircleIcon'?
Error: src/licensing/utils/hardware.utils.ts(119,57): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/utils/hardware.utils.ts(141,50): error TS18046: 'error' is of type 'unknown'.
Error: src/licensing/utils/hardware.utils.ts(161,55): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(175,57): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(192,55): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(206,57): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(226,59): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(242,59): error TS2554: Expected 0 arguments, but got 1.
Error: src/licensing/utils/hardware.utils.ts(270,51): error TS2554: Expected 0 arguments, but got 1.
Error: src/plugins/api/APIProvider.ts(232,56): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(272,49): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(281,49): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(290,52): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(308,51): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(326,50): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/api/APIProvider.ts(392,48): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(396,49): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(405,50): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
  Type 'Function' provides no match for the signature '(...args: any[]): void'.
Error: src/plugins/api/APIProvider.ts(550,14): error TS2339: Property 'emit' does not exist on type 'BearAIAPI'.
Error: src/plugins/api/APIProvider.ts(594,47): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/core/ConfigManager.ts(238,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/core/PluginManager.ts(317,27): error TS2339: Property 'config' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(318,84): error TS2339: Property 'config' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(412,26): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(414,40): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(425,26): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/core/PluginManager.ts(427,40): error TS2339: Property 'hooks' does not exist on type 'PluginMetadata'.
Error: src/plugins/dev-tools/PluginDeveloper.ts(199,68): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/index.ts(264,28): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
Error: src/plugins/index.ts(269,29): error TS2345: Argument of type 'Function' is not assignable to parameter of type '(...args: any[]) => void'.
Error: src/plugins/sandbox/IFrameSandbox.ts(66,59): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(35,61): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(81,43): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(156,16): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(166,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(182,53): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/IsolatedSandbox.ts(240,59): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/sandbox/SandboxManager.ts(284,31): error TS2345: Argument of type 'PluginPermission' is not assignable to parameter of type 'never'.
Error: src/plugins/sandbox/WebWorkerSandbox.ts(55,63): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/security/SecurityManager.ts(102,40): error TS18046: 'error' is of type 'unknown'.
Error: src/plugins/security/SecurityManager.ts(571,34): error TS2349: This expression is not callable.
  Each member of the union type '{ (callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: string[]) => string): string; (callbackfn: (previousValue: string, currentValue: string, currentIndex: number, array: string[]) => string, initialValue: string): string; <U>(callbackfn: (previousValue: U, currentValue: string, ...' has signatures, but none of those signatures are compatible with each other.
Error: src/reportWebVitals.ts(1,10): error TS2305: Module '"web-vitals"' has no exported member 'ReportHandler'.
Error: src/reportWebVitals.ts(5,34): error TS2339: Property 'getCLS' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,42): error TS2339: Property 'getFID' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,50): error TS2339: Property 'getFCP' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,58): error TS2339: Property 'getLCP' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/reportWebVitals.ts(5,66): error TS2339: Property 'getTTFB' does not exist on type '{ default: typeof import("/home/runner/work/BEAR_AI/BEAR_AI/node_modules/web-vitals/dist/modules/index"); onCLS: (onReport: (metric: CLSMetric) => void, opts?: ReportOpts | undefined) => void; ... 10 more ...; FIDThresholds: MetricRatingThresholds; }'.
Error: src/services/chat/storage.ts(195,31): error TS2345: Argument of type '{ messages: Message[]; id: string; title: string; participants: User[]; createdAt: Date; updatedAt: Date; isArchived: boolean; tags: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/chatIntegration.ts(14,11): error TS2367: This comparison appears to be unintentional because the types 'boolean' and 'string' have no overlap.
Error: src/services/chatIntegration.ts(35,44): error TS18046: 'error' is of type 'unknown'.
Error: src/services/chatSessions.ts(10,10): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/chatSessions.ts(10,23): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/configManager.ts(388,22): error TS2345: Argument of type '"config.imported"' is not assignable to parameter of type 'ConfigEventType'.
Error: src/services/configManager.ts(442,20): error TS2345: Argument of type '"config.reset"' is not assignable to parameter of type 'ConfigEventType'.
Error: src/services/environmentConfigLoader.ts(168,29): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(183,35): error TS2345: Argument of type '{ file: string; errors: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(187,33): error TS2345: Argument of type '{ file: string; errors: string[]; }' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(200,37): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(205,35): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/environmentConfigLoader.ts(413,27): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/environmentConfigLoader.ts(416,26): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/environmentConfigLoader.ts(419,34): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/errorSystem.ts(11,108): error TS2307: Cannot find module './errorAnalytics' or its corresponding type declarations.
Error: src/services/fileMetadata.ts(85,11): error TS2322: Type '{ tags: never[]; categories: never[]; keywords: never[]; indexed: false; version: number; accessCount: number; lastAccessed: Date; searchCount: number; editCount: number; permissions: { read: true; write: true; delete: true; }; ... 29 more ...; duplicates?: string[] | undefined; }' is not assignable to type 'ExtendedFileMetadata'.
  Types of property 'id' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
Error: src/services/huggingface/HuggingFaceService.ts(396,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(398,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(558,23): error TS2345: Argument of type 'any' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/HuggingFaceService.ts(562,23): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/huggingface/ModelSwitcher.ts(153,57): error TS2345: Argument of type 'Partial<ModelConfiguration>' is not assignable to parameter of type 'ModelConfiguration'.
  Types of property 'maxLength' are incompatible.
    Type 'number | undefined' is not assignable to type 'number'.
      Type 'undefined' is not assignable to type 'number'.
Error: src/services/inference/batchProcessorConfig.ts(85,14): error TS2323: Cannot redeclare exported variable 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(146,54): error TS2339: Property 'promises' does not exist on type '{ default: typeof import("fs"); rename: typeof rename; renameSync(oldPath: PathLike, newPath: PathLike): void; truncate: typeof truncate; truncateSync(path: PathLike, len?: number | undefined): void; ... 95 more ...; constants: typeof constants; }'.
Error: src/services/inference/batchProcessorConfig.ts(182,14): error TS2323: Cannot redeclare exported variable 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(360,14): error TS2323: Cannot redeclare exported variable 'BatchConfigurationValidator'.
Error: src/services/inference/batchProcessorConfig.ts(426,3): error TS2323: Cannot redeclare exported variable 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(426,3): error TS2484: Export declaration conflicts with exported declaration of 'SystemCapabilityDetector'.
Error: src/services/inference/batchProcessorConfig.ts(427,3): error TS2323: Cannot redeclare exported variable 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(427,3): error TS2484: Export declaration conflicts with exported declaration of 'BatchConfigurationOptimizer'.
Error: src/services/inference/batchProcessorConfig.ts(428,3): error TS2323: Cannot redeclare exported variable 'BatchConfigurationValidator'.
Error: src/services/inference/batchProcessorConfig.ts(428,3): error TS2484: Export declaration conflicts with exported declaration of 'BatchConfigurationValidator'.
Error: src/services/inference/index.ts(8,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(9,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(10,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(12,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(13,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(14,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(15,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(16,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(25,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(26,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(27,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(28,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(32,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(33,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(34,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(35,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/index.ts(36,3): error TS1205: Re-exporting a type when the '--isolatedModules' flag is provided requires using 'export type'.
Error: src/services/inference/localInferenceEngine.ts(248,22): error TS2304: Cannot find name 'this'.
Error: src/services/knowledge/analytics/AnalyticsService.ts(125,50): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/citations/CitationService.ts(111,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(21,11): error TS2564: Property 'documentIndexer' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(22,11): error TS2564: Property 'semanticSearch' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(23,11): error TS2564: Property 'knowledgeGraph' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(24,11): error TS2564: Property 'ragService' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(25,11): error TS2564: Property 'vectorDb' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(26,11): error TS2564: Property 'versioning' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(27,11): error TS2564: Property 'citations' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(28,11): error TS2564: Property 'analytics' has no initializer and is not definitely assigned in the constructor.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(98,50): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(127,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(155,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(173,41): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(182,49): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/core/KnowledgeBaseService.ts(304,45): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(223,30): error TS2339: Property 'value' does not exist on type 'IDBCursor'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(493,29): error TS2339: Property 'value' does not exist on type 'IDBCursor'.
Error: src/services/knowledge/database/VectorDatabaseService.ts(538,44): error TS2345: Argument of type 'void' is not assignable to parameter of type 'IDBRequest<IDBCursor | null>'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(77,55): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(113,40): error TS2339: Property 'concepts' does not exist on type 'DocumentMetadata'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(152,40): error TS2339: Property 'entityMentions' does not exist on type 'DocumentMetadata'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(310,58): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(348,58): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/graph/KnowledgeGraphService.ts(594,13): error TS2345: Argument of type 'Float32Array | undefined' is not assignable to parameter of type 'Float32Array'.
  Type 'undefined' is not assignable to type 'Float32Array'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(49,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(62,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(71,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/indexing/DocumentIndexer.ts(92,9): error TS2322: Type '{ wordCount: number; characterCount: number; readingTime: number; entityMentions: string[]; concepts: string[]; author?: string | undefined; subject?: string | undefined; keywords?: string[] | undefined; ... 4 more ...; relevance?: number | undefined; }' is not assignable to type 'DocumentMetadata'.
  Object literal may only specify known properties, and 'entityMentions' does not exist in type 'DocumentMetadata'.
Error: src/services/knowledge/indexing/EmbeddingService.ts(49,66): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/rag/RAGService.ts(66,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(68,41): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(92,49): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/search/SemanticSearchService.ts(204,34): error TS2345: Argument of type '{ options: { semantic: boolean; fuzzy?: boolean | undefined; exact?: boolean | undefined; includeSummary?: boolean | undefined; includeContext?: boolean | undefined; contextWindow?: number | undefined; rankingModel?: "bm25" | ... 2 more ... | undefined; }; text: string; filters?: SearchFilters | undefined; }' is not assignable to parameter of type 'SearchQuery'.
  The types of 'options.fuzzy' are incompatible between these types.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
      Type 'undefined' is not assignable to type 'boolean'.
Error: src/services/knowledge/search/SemanticSearchService.ts(205,31): error TS2345: Argument of type '{ options: { exact: boolean; semantic?: boolean | undefined; fuzzy?: boolean | undefined; includeSummary?: boolean | undefined; includeContext?: boolean | undefined; contextWindow?: number | undefined; rankingModel?: "bm25" | ... 2 more ... | undefined; }; text: string; filters?: SearchFilters | undefined; }' is not assignable to parameter of type 'SearchQuery'.
  The types of 'options.semantic' are incompatible between these types.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/services/knowledge/versioning/DocumentVersioningService.ts(87,52): error TS18046: 'error' is of type 'unknown'.
Error: src/services/knowledge/versioning/DocumentVersioningService.ts(371,53): error TS18046: 'error' is of type 'unknown'.
Error: src/services/legalChatService.ts(49,7): error TS2322: Type '{ id: string; title: string; messages: never[]; createdAt: Date; updatedAt: Date; tags: (PracticeArea | Jurisdiction)[]; category: string; practiceArea: PracticeArea; jurisdiction: Jurisdiction; clientMatter: string | undefined; confidentialityLevel: "confidential" | ... 2 more ... | "work-product"; }' is not assignable to type 'ChatSession'.
  Object literal may only specify known properties, and 'practiceArea' does not exist in type 'ChatSession'.
Error: src/services/legalChatService.ts(121,7): error TS2322: Type '"legal-query"' is not assignable to type '"system" | "text" | "document" | "analysis" | "citation" | "code" | "file" | "image"'.
Error: src/services/legalChatService.ts(172,65): error TS2345: Argument of type '{ temperature: number; maxTokens: number; }' is not assignable to parameter of type 'StreamingOptions'.
  Property 'stream' is missing in type '{ temperature: number; maxTokens: number; }' but required in type 'StreamingOptions'.
Error: src/services/legalChatService.ts(178,33): error TS2504: Type 'Promise<string>' must have a '[Symbol.asyncIterator]()' method that returns an async iterator.
Error: src/services/legalChatService.ts(263,25): error TS18046: 'error' is of type 'unknown'.
Error: src/services/localFileSystem.ts(116,50): error TS2339: Property 'entries' does not exist on type 'FileSystemDirectoryHandle'.
Error: src/services/localFileSystem.ts(230,37): error TS2339: Property 'queryPermission' does not exist on type 'FileSystemFileHandle | FileSystemDirectoryHandle'.
  Property 'queryPermission' does not exist on type 'FileSystemFileHandle'.
Error: src/services/localFileSystem.ts(241,37): error TS2339: Property 'requestPermission' does not exist on type 'FileSystemFileHandle | FileSystemDirectoryHandle'.
  Property 'requestPermission' does not exist on type 'FileSystemFileHandle'.
Error: src/services/modelConfigManager.ts(8,3): error TS2305: Module '"../types/modelTypes"' has no exported member 'ModelConfiguration'.
Error: src/services/modelManager.ts(27,31): error TS2307: Cannot find module '../utils/memoryAwareLoader' or its corresponding type declarations.
Error: src/services/modelManager.ts(28,52): error TS2307: Cannot find module './gpt4allIntegration' or its corresponding type declarations.
Error: src/services/modelManager.ts(31,39): error TS2307: Cannot find module '../utils/modelCapabilitiesDetector' or its corresponding type declarations.
Error: src/services/modelManager.ts(33,39): error TS2307: Cannot find module '../utils/offlinePerformanceMonitor' or its corresponding type declarations.
Error: src/services/modelManager.ts(764,41): error TS18048: 'model.loadedAt' is possibly 'undefined'.
Error: src/services/modelManager.ts(1154,11): error TS2749: 'ModelStatus' refers to a value, but is being used as a type here. Did you mean 'typeof ModelStatus'?
Error: src/services/offlineSync.ts(168,7): error TS2322: Type '{ synced: boolean; lastSynced: Date; pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }' is not assignable to type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
  Object literal may only specify known properties, and 'synced' does not exist in type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
Error: src/services/offlineSync.ts(194,7): error TS2322: Type '{ synced: boolean; lastSynced: Date; pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }' is not assignable to type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
  Object literal may only specify known properties, and 'synced' does not exist in type '{ pages?: number | undefined; wordCount: number; characters: number; author?: string | undefined; createdDate?: Date | undefined; modifiedDate?: Date | undefined; format: string; }'.
Error: src/services/offlineSync.ts(237,9): error TS2345: Argument of type '{ path: any; movedFrom: any; lastModified: Date; }' is not assignable to parameter of type 'Partial<ExtendedFileMetadata>'.
  Object literal may only specify known properties, and 'movedFrom' does not exist in type 'Partial<ExtendedFileMetadata>'.
Error: src/services/settings/localSettingsService.ts(240,35): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/settings/localSettingsService.ts(366,33): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/settings/localSettingsService.ts(386,39): error TS2345: Argument of type 'string | Buffer' is not assignable to parameter of type 'string'.
  Type 'Buffer' is not assignable to type 'string'.
Error: src/services/streamingManager.ts(2,59): error TS2307: Cannot find module './errorRecovery' or its corresponding type declarations.
Error: src/services/streamingService.ts(208,76): error TS18046: 'error' is of type 'unknown'.
Error: src/services/streamingService.ts(237,96): error TS18046: 'error' is of type 'unknown'.
Error: src/services/streamingService.ts(355,78): error TS18046: 'error' is of type 'unknown'.
Error: src/services/userSettings.ts(284,48): error TS2552: Cannot find name 'remgedSettings'. Did you mean 'remoteSettings'?
Error: src/services/userSettings.ts(363,30): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(376,28): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(388,30): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(395,26): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
Error: src/services/userSettings.ts(413,48): error TS2322: Type 'Partial<{ highContrast: boolean; largeText: boolean; screenReader: boolean; keyboardNavigation: boolean; }>' is not assignable to type '{ highContrast: boolean; largeText: boolean; screenReader: boolean; keyboardNavigation: boolean; }'.
  Types of property 'highContrast' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/services/userSettings.ts(444,48): error TS2322: Type 'Partial<{ desktop: boolean; email: boolean; inApp: boolean; sound: boolean; }>' is not assignable to type '{ desktop: boolean; email: boolean; inApp: boolean; sound: boolean; }'.
  Types of property 'desktop' are incompatible.
    Type 'boolean | undefined' is not assignable to type 'boolean'.
Error: src/state/bear-store.ts(12,19): error TS2305: Module '"zustand/middleware/persist"' has no exported member 'createJSONStorage'.
Error: src/state/bear-store.ts(216,29): error TS2554: Expected 1 arguments, but got 0.
Error: src/state/bear-store.ts(217,3): error TS2554: Expected 0 arguments, but got 1.
Error: src/state/bear-store.ts(257,13): error TS18046: 'agent' is of type 'unknown'.
Error: src/state/bear-store.ts(257,43): error TS18046: 'agent' is of type 'unknown'.
Error: src/state/bear-store.ts(278,63): error TS18046: 'doc' is of type 'unknown'.
Error: src/state/bear-store.ts(310,60): error TS18046: 'task' is of type 'unknown'.
Error: src/state/bear-store.ts(368,62): error TS18046: 'model' is of type 'unknown'.
Error: src/state/bear-store.ts(518,36): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(524,63): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(629,29): error TS18046: 'error' is of type 'unknown'.
Error: src/state/bear-store.ts(653,32): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(654,35): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(655,31): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(656,32): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(657,28): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(658,34): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/bear-store.ts(662,17): error TS2349: This expression is not callable.
  Type 'BearStore' has no call signatures.
Error: src/state/unified/stateManager.tsx(7,38): error TS2307: Cannot find module '@/utils/unified/logger' or its corresponding type declarations.
Error: src/state/unified/stateManager.tsx(8,41): error TS2307: Cannot find module '@/utils/unified/errorHandler' or its corresponding type declarations.
Error: src/utils/chat/codeExecution.ts(180,7): error TS2531: Object is possibly 'null'.
Error: src/utils/chat/codeExecution.ts(181,7): error TS2531: Object is possibly 'null'.
Error: src/utils/cn.ts(1,15): error TS2614: Module '"clsx"' has no exported member 'ClassValue'. Did you mean to use 'import ClassValue from "clsx"' instead?
Error: src/utils/cn.ts(1,27): error TS2614: Module '"clsx"' has no exported member 'clsx'. Did you mean to use 'import clsx from "clsx"' instead?
Error: src/utils/huggingface/CompatibilityValidator.ts(244,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(259,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(274,21): error TS2345: Argument of type '{ component: string; currentSpec: string; recommendedSpec: string; estimatedCost: number; compatibilityImprovement: number; modelsEnabled: string[]; }' is not assignable to parameter of type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,26): error TS2339: Property 'compatibilityImprovement' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,55): error TS2339: Property 'estimatedCost' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,75): error TS2339: Property 'compatibilityImprovement' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(280,104): error TS2339: Property 'estimatedCost' does not exist on type 'never'.
Error: src/utils/huggingface/CompatibilityValidator.ts(281,19): error TS2339: Property 'component' does not exist on type 'never'.
Error: src/utils/localStorageBackup.ts(260,20): error TS18046: 'error' is of type 'unknown'.
Error: src/utils/localStorageBackup.ts(366,41): error TS18046: 'error' is of type 'unknown'.
Error: Process completed with exit code 2.