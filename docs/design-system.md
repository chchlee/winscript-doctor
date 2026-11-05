# WinScript Doctor design system

The desktop interface uses the shadcn/ui New York components, Tailwind CSS v4 and Lucide icons. The neutral theme shares semantic CSS variables between light and dark appearances. Primary controls use foreground and background contrast, with amber and green reserved for evidence states.

Buttons, inputs, badges, dialogs, tooltips and settings use the components in frontend/src/components/ui. Desktop composition rules are defined with Tailwind utilities in frontend/src/styles.css. The inventory and evidence panels adapt to the window width, and long tables scroll within their panels.

Nanum Gothic regular and bold are bundled as local WOFF2 fonts. Latin and Korean resources total approximately 0.8 MB. The fonts are distributed under SIL Open Font License 1.1 with the dependency license notices included in packages. [Font and license](https://fontsource.org/fonts/nanum-gothic/about)

English is the default. Settings → Language offers English and 한국어, and stores the choice on the current device. Switching languages updates navigation, settings, collection and import dialogs, comparison labels, server checks, notifications and built-in evidence text. Native file-dialog titles use the same selection. Imported user-authored snapshot text is displayed as supplied, with known built-in messages localized for readability.

The workspace retains its selection and filters when the interface language changes. The document language attribute follows the preference for assistive technology. Dates use the selected language's formatting and the workspace's existing Asia/Seoul display timezone. Preferences include language and light/dark appearance.

The main layout targets 1440×980 and adapts at 1290 pixels by placing script details below the inventory. The minimum desktop window is 1024×720. Focus indicators, keyboard-accessible dialogs, text labels alongside status colors and reduced-motion preferences are part of the component styles.
