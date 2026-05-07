# AI Studio Components

This directory contains the modular, tab-based components for the AI Studio interface.

## Architecture Overview

The AI Studio has been redesigned from a single crowded form to a clean, scalable tab-based system. Each functional area is now a dedicated component that can be maintained and extended independently.

## Component Structure

```
ai-studio/
├── TabNavigation.tsx       # Horizontal tab navigation bar
├── Toast.tsx               # Toast notification component
├── PolicyUploadTab.tsx     # Tab 1: Policy upload and configuration
├── LyricsGeneratorTab.tsx  # Tab 2: AI-powered lyrics creation
├── ReminderPhrasesTab.tsx  # Tab 3: Reminder phrases generator
├── QuizBuilderTab.tsx      # Tab 4: Quiz builder (AI + manual authoring)
├── ModuleManagerTab.tsx    # Tab 5: Save content to modules
└── index.ts               # Component exports
```

## Tab Components

### 1. PolicyUploadTab
**Purpose**: Handle document upload and initial configuration (per training module)

**Features**:
- Drag-and-drop PDF upload (used when attaching policy documents to a module)
- Policy text input for AI processing and storage
- Emphasis prompt for AI guidance (stored alongside each module)
- File validation
- Next step navigation
- Upload history display

**Props**:
- `policyFile`: Current uploaded file
- `policyText`: Policy text content
- `emphasisPrompt`: AI guidance text
- `onPolicyFileChange`: File change handler
- `onPolicyTextChange`: Text change handler
- `onEmphasisPromptChange`: Prompt change handler
- `onNext`: Navigate to next tab

### 2. LyricsGeneratorTab
**Purpose**: AI-powered lyrics creation and editing

**Features**:
- Generate/regenerate lyrics button
- Real-time lyrics editing
- Copy to clipboard
- Token usage display
- Loading states
- Tips section

**Props**:
- `lyrics`: Current lyrics text
- `loading`: Loading state
- `usage`: Token usage information
- `onLyricsChange`: Text change handler
- `onGenerate`: Generate lyrics handler
- `onSaveDraft`: Save draft handler (optional)

### 3. ReminderPhrasesTab
**Purpose**: Generate and manage reminder phrases

**Features**:
- Two-column layout (Reinforcers + Policy Highlights)
- Auto-generate all phrases
- Manual editing capability
- Add individual phrases
- Clear all functionality
- Export option (optional)
- Real-time phrase count

**Props**:
- `reinforcement`: Array of lyric reinforcers
- `policyHighlights`: Array of policy highlights
- `loading`: Loading state
- `usage`: Token usage information
- `onReinforcementChange`: Update reinforcer handler
- `onPolicyHighlightChange`: Update highlight handler
- `onAddReinforcement`: Add reinforcer handler
- `onAddPolicyHighlight`: Add highlight handler
- `onGenerate`: Generate all phrases handler
- `onClearAll`: Clear all phrases handler (optional)
- `onExport`: Export handler (optional)

### 4. QuizBuilderTab
**Purpose**: Build quizzes from policy content (AI-assisted + manual editor)

**Features**:
- Select any training module and load/edit its quiz
- AI question generator (leverages policy PDF/text, lyrics, reinforcement phrases)
- Automatic difficulty mix + token usage display
- Manual authoring for multiple choice, true/false, fill-in-the-blank
- Passing score control, question list management, and quiz persistence

**Props**:
- `modules`: Training modules available to target
- `policyFile`: Uploaded policy PDF (used when calling AI)
- `policyText`: Policy body text (required for AI generation)
- `lyrics`: Generated lyrics (optional AI signal)
- `reinforcementPhrases`: Reminder phrases (optional AI signal)
- `policyHighlights`: Policy highlight phrases (optional AI signal)
- `onShowToast`: Callback for toast notifications

### Module Context Loader
Under the AI Studio header there is a global module loader that lets admins pick any existing training module and hydrate the entire workspace (policy summary, emphasis prompt, lyrics, reminder phrases). The same panel also handles creating brand-new modules, editing the title/category/description, and triggering manual saves—so every tab always works against a single module context.

## Shared Components

### TabNavigation
Horizontal tab navigation bar with visual indicators

**Features**:
- Active tab highlighting
- Completed tabs (checkmark)
- Unsaved work indicator (dot)
- Smooth transitions
- Responsive scrolling

**Props**:
- `tabs`: Array of tab objects with `id` and `label`
- `activeTab`: Currently active tab ID
- `onTabChange`: Tab change handler
- `completedTabs`: Array of completed tab IDs (optional)
- `tabsWithUnsavedWork`: Array of tab IDs with unsaved work (optional)
- `disabledTabIds`: Tabs that should be disabled (by id) even if they are not currently active

### Toast
Toast notification component for user feedback

**Features**:
- Success, error, and warning types
- Auto-dismiss after 4 seconds
- Manual close option
- Color-coded styling

**Props**:
- `type`: 'success' | 'error' | 'warning'
- `message`: Toast message text
- `onClose`: Close handler (optional)

## State Management

The main AI Studio page (`app/admin/ai-studio/page.tsx`) manages:

1. **Tab State**: Active tab, completed tabs tracking
2. **Data State**: All form data, generated content
3. **Loading States**: Per-operation loading indicators
4. **UI State**: Toast notifications, forms visibility

### Auto-Save Feature

Data is automatically saved to localStorage every 30 seconds:
- Policy text
- Emphasis prompt
- Generated lyrics
- Reminder phrases
- Timestamp

Saved data is restored on page load if less than 24 hours old.

## Adding New Tabs

To add a new module tab:

1. **Create the component** in this directory:
   ```typescript
   // NewModuleTab.tsx
   export default function NewModuleTab(props) {
     return (
       <div className="container mx-auto px-4 py-8 max-w-5xl">
         {/* Your content */}
       </div>
     );
   }
   ```

2. **Add to TABS array** in `page.tsx`:
   ```typescript
   const TABS = [
     // ... existing tabs
     { id: 'new-module', label: 'New Module' },
   ];
   ```

3. **Add to renderTabContent** switch statement:
   ```typescript
   case 'new-module':
     return <NewModuleTab {...props} />;
   ```

4. **Export from index.ts**:
   ```typescript
   export { default as NewModuleTab } from './NewModuleTab';
   ```

## Styling Guidelines

All components follow consistent styling:

- **Container**: `max-w-4xl` or `max-w-5xl` or `max-w-7xl` based on content needs
- **Cards**: White background, rounded-2xl, border-gray-200, shadow-sm
- **Buttons**: Primary buttons use gradient (primary-600 to primary-700)
- **Inputs**: rounded-xl borders with focus states (primary-500 ring)
- **Spacing**: Consistent 24px padding (p-6 or p-8)
- **Colors**: Use Tailwind theme colors (primary-*, accent-*)

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader announcements
- Semantic HTML

## Testing Checklist

- [ ] All functional features work in new tab system
- [ ] No console errors or warnings
- [ ] Data persists when switching tabs
- [ ] Auto-save works correctly
- [ ] Can complete full workflow (upload → generate → save)
- [ ] Responsive on tablet and desktop (768px+)
- [ ] Loading states display properly
- [ ] Error messages are clear and actionable
- [ ] Toast notifications appear and dismiss correctly
- [ ] Completed tabs show checkmarks
- [ ] Policy file validation works

## Future Enhancements

1. **Quiz Builder**: Implement full quiz generation functionality
2. **Enhanced Validation**: Add more robust form validation
3. **Undo/Redo**: Add undo/redo functionality for text editing
4. **Version History**: Track and restore previous versions
5. **Collaboration**: Real-time collaboration features
6. **Templates**: Pre-built templates for common policies
7. **AI Improvements**: More AI generation options and customization
8. **Export Formats**: Additional export formats (JSON, CSV, etc.)

## Performance Considerations

- Components are lazy-loaded only when their tab is active
- Auto-save is debounced to prevent excessive localStorage writes
- Large text areas are optimized for performance
- Images and heavy assets are avoided in favor of SVG icons

## Browser Support

Tested and working on:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Notes

- The Quiz Builder tab is intentionally a placeholder - no "coming soon" buttons exist
- All "coming soon" elements from the old design have been removed
- The design supports 10+ modules without UI crowding
- State is preserved across tab switches for a seamless experience
