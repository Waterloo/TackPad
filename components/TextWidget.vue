<template>
    <div class="text-widget">
        <WidgetOptions :itemId="props.itemId" @wheel.stop>
            <!-- Font Selection -->
            <div class="flex gap-3 p-2">
                <Button
                    type="button"
                    :label="selectedFont"
                    @click="toggleFontPopover"
                    ref="fontButton"
                    size="small"
                    severity="secondary"
                    class="mr-2"
                />
                <Popover ref="fontPopover">
                    <div class="flex flex-col gap-2 w-48">
                        <div class="font-medium mb-2">Font Family</div>
                        <Button
                            v-for="font in fonts"
                            :key="font.value"
                            :label="font.label"
                            @click="selectFont(font)"
                            :severity="
                                selectedFont === font.label
                                    ? 'primary'
                                    : 'secondary'
                            "
                            size="small"
                            class="justify-start"
                            :style="{ fontFamily: font.value }"
                        />
                    </div>
                </Popover>

                <!-- Font Size -->
                <Button
                    type="button"
                    :label="getFontSizeLabel(fontSize)"
                    @click="toggleSizePopover"
                    ref="sizeButton"
                    size="small"
                    severity="secondary"
                    class="mr-2 w-12"
                />
                <Popover ref="sizePopover">
                    <div class="flex gap-2 items-center">
                        <div class="font-medium">Font Size</div>
                        <Button
                            v-for="size in sizeOptions"
                            :key="size.value"
                            :label="size.label"
                            @click="selectSize(size)"
                            :severity="
                                fontSize === size.value
                                    ? 'primary'
                                    : 'secondary'
                            "
                            size="small"
                            class="justify-start"
                        />
                    </div>
                </Popover>

                <!-- Text Color -->
                <Button
                    type="button"
                    @click="toggleColorPopover"
                    ref="colorButton"
                    size="small"
                    severity="secondary"
                >
                    <div
                        class="w-4 h-4 rounded border"
                        :style="{ backgroundColor: textColor }"
                    ></div>
                </Button>
                <Popover ref="colorPopover" position="top-start">
                    <div class="flex flex-col gap-3 w-64">
                        <div class="font-medium">Text Color</div>
                        <div class="flex gap-2 flex-wrap">
                            <button
                                v-for="color in textColors"
                                :key="color"
                                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :style="{ backgroundColor: color }"
                                :class="{
                                    'border-blue-500': textColor === color,
                                    'border-gray-300': textColor !== color,
                                }"
                                :aria-label="`Select ${getTextColorName(color)} text color`"
                                :aria-pressed="textColor === color"
                                @click="selectColor(color)"
                            />
                        </div>
                        <div class="flex gap-2 items-center">
                            <label class="text-sm whitespace-nowrap"
                                >Custom:</label
                            >
                            <div class="relative flex-1">
                                <InputText
                                    v-model="customColor"
                                    @input="selectColor(customColor)"
                                    placeholder="#000000"
                                    class="w-full pr-8"
                                    size="small"
                                />
                                <div
                                    class="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 rounded border border-gray-300"
                                    :style="{
                                        backgroundColor: isValidHexColor(
                                            customColor,
                                        )
                                            ? customColor
                                            : '#ffffff',
                                    }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </Popover>

                <!-- Formatting Options -->
                <div class="flex gap-1 mr-2">
                    <Button
                        @click="toggleBold"
                        :severity="isBold ? 'primary' : 'secondary'"
                        size="small"
                        class="w-8 h-8 p-0"
                    >
                        <span class="font-bold text-xs">B</span>
                    </Button>
                    <Button
                        @click="toggleItalic"
                        :severity="isItalic ? 'primary' : 'secondary'"
                        size="small"
                        class="w-8 h-8 p-0"
                    >
                        <span class="italic text-xs">B</span>
                    </Button>
                    <Button
                        @click="toggleUnderline"
                        :severity="isUnderline ? 'primary' : 'secondary'"
                        size="small"
                        class="w-8 h-8 p-0"
                    >
                        <span
                            class="text-xs font-bold"
                            style="text-decoration: underline"
                            >U</span
                        >
                    </Button>
                </div>

                <!-- Alignment -->

                <Button
                    type="button"
                    @click="cycleAlign"
                    size="small"
                    severity="secondary"
                    class="w-8 h-8 p-0"
                >
                    <Icon :name="getAlignIcon()" />
                </Button>
            </div>
        </WidgetOptions>

        <div v-if="isEditing" class="editing-container h-full">
            <textarea
                v-model="content"
                @blur="saveContent"
                ref="textArea"
                class="w-full h-full p-4 resize-none focus:outline-none"
                :style="getTextStyle()"
                @mousedown.stop
                placeholder="Type your text here..."
            ></textarea>
        </div>
        <div
            v-else
            class="display-container h-full p-4 cursor-text min-h-24"
            :style="getTextStyle()"
            @dblclick.stop.prevent="handleDoubleClick"
            @pointerdown.stop.prevent="handlePointerDown"
            @pointerup.stop.prevent="handlePointerUp"
            @touchstart.stop.prevent="isTouchDevice = true"
        >
            <div v-if="content" v-html="getFormattedContent()"></div>
            <div v-else class="text-gray-400 italic">
                Double click to edit text
            </div>
        </div>
        <Button
            variant="text"
            v-if="isEditing && isTouchDevice"
            @click="isEditing = false"
            size="sm"
            class="fixed bottom-2 right-2 z-20"
        >
            <Icon name="lucide:check" class="w-4 h-4" />
        </Button>
        <!-- <Button
            v-if="!isEditing && $device.isMobileOrTablet"
            @click.stop="startEditing"
            class="absolute top-2 right-2 z-20"
            title="Edit text"
            variant="text"
        >
            <Icon name="lucide:pencil" class="w-4 h-4" />
        </Button> -->
    </div>
</template>

<script setup lang="ts">
import { useTextWidgetStore } from "~/stores/textWidgetStore";
import type { TextWidgetFormatting } from "~/types/board";
const props = defineProps<{
    itemId: string;
    isSelected: boolean;
    initialText?: string;
    initialFormatting?: TextWidgetFormatting;
    startMove?: (event: PointerEvent) => void;
}>();

const textWidgetStore = useTextWidgetStore();

// Content and editing state
const content = ref(props.initialText || "");
const isEditing = ref(false);
const textArea = ref<HTMLTextAreaElement | null>(null);

// Formatting state
const selectedFont = ref("Arial");
const fontSize = ref(16);
const textColor = ref("#000000");
const isBold = ref(false);
const isItalic = ref(false);
const isUnderline = ref(false);
const textAlign = ref("left");
const customColor = ref("#000000");

// Popover refs
const fontPopover = ref();
const colorPopover = ref();
const fontButton = ref();
const colorButton = ref();
const sizePopover = ref();
// Timer for delayed move
const moveTimer = ref<NodeJS.Timeout | null>(null);
const lastTapTime = ref(0);
const lastTapPosition = ref({ x: 0, y: 0 });
const DOUBLE_TAP_DELAY = 300; // Maximum time between taps for double tap (ms)
const DOUBLE_TAP_DISTANCE = 30; // Maximum distance between taps (pixels)
const isTouchDevice = ref(false);
// Font options
const fonts = [
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica", value: "Helvetica, sans-serif" },
    { label: "Times New Roman", value: '"Times New Roman", serif' },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier New", value: '"Courier New", monospace' },
    { label: "Verdana", value: "Verdana, sans-serif" },
    { label: "Bad Script", value: '"Bad Script", cursive' },
    { label: "Comic Sans MS", value: '"Comic Sans MS", cursive' },
];

// Font sizes
const sizeOptions = [
    { label: "xs", value: 16 },
    { label: "sm", value: 20 },
    { label: "md", value: 24 },
    { label: "lg", value: 36 },
    { label: "xl", value: 48 },
];
const textColors = [
    "#2D3748", // Deep Charcoal - Confidence & Authority
    "#C53030", // Rich Crimson - Passion & Urgency
    "#2F855A", // Forest Green - Growth & Success
    "#3B82F6", // Ocean Sky Blue - Freedom & Tranquility
    "#4f46e5", // Rich Brand Blue - Brand Identity & Trust
    "#805AD5", // Royal Purple - Creativity & Wisdom
    "#D69E2E", // Golden Amber - Energy & Optimism
    "#B83280", // Deep Rose - Love & Compassion
    "#2C5282", // Midnight Blue - Depth & Reflection
] as const;

const textColorNames: Record<string, string> = {
    "#2D3748": "Deep Charcoal",
    "#C53030": "Rich Crimson",
    "#2F855A": "Forest Green",
    "#3B82F6": "Ocean Sky Blue",
    "#4f46e5": "Rich Brand Blue",
    "#805AD5": "Royal Purple",
    "#D69E2E": "Golden Amber",
    "#B83280": "Deep Rose",
    "#2C5282": "Midnight Blue",
};

function getTextColorName(color: string): string {
    return textColorNames[color] || "Custom";
}

function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
// Alignment options
const alignOptions = [
    { label: "Left", value: "left", icon: "lucide:align-left" },
    { label: "Center", value: "center", icon: "lucide:align-center" },
    { label: "Right", value: "right", icon: "lucide:align-right" },
    { label: "Justify", value: "justify", icon: "lucide:align-justify" },
];

// Initialize formatting from props
function initializeFormatting() {
    if (props.initialFormatting) {
        const fmt = props.initialFormatting;
        selectedFont.value =
            fonts.find((f) => f.value === fmt.fontFamily)?.label || "Arial";
        fontSize.value = fmt.fontSize || 16;
        textColor.value = fmt.textColor || "#000000";
        isBold.value = fmt.bold || false;
        isItalic.value = fmt.italic || false;
        isUnderline.value = fmt.underline || false;
        textAlign.value = fmt.textAlign || "left";
        customColor.value = textColor.value;
    }
}

// Initialize on mount
initializeFormatting();

function handlePointerDown(event: PointerEvent) {
    const currentTime = Date.now();
    const currentPosition = { x: event.clientX, y: event.clientY };

    // Calculate distance from last tap
    const distance = Math.sqrt(
        Math.pow(currentPosition.x - lastTapPosition.value.x, 2) +
        Math.pow(currentPosition.y - lastTapPosition.value.y, 2)
    );

    // Check if this is a double tap
    const timeSinceLastTap = currentTime - lastTapTime.value;
    const isDoubleTap = timeSinceLastTap < DOUBLE_TAP_DELAY &&
                       distance < DOUBLE_TAP_DISTANCE &&
                       lastTapTime.value > 0;

    if (isDoubleTap) {
        // Handle double tap - cancel any pending move and start editing
        if (moveTimer.value) {
            clearTimeout(moveTimer.value);
            moveTimer.value = null;
        }
        startEditing();
        // Reset tap tracking
        lastTapTime.value = 0;
        lastTapPosition.value = { x: 0, y: 0 };
        return;
    }

    // Update tap tracking for potential future double tap
    lastTapTime.value = currentTime;
    lastTapPosition.value = currentPosition;

    // Clear any existing timer
    if (moveTimer.value) {
        clearTimeout(moveTimer.value);
        moveTimer.value = null;
    }

    // Start move after a short delay to allow double-tap detection
    moveTimer.value = setTimeout(() => {
        // This will only execute if not cancelled by double-tap
        if (props.startMove) {
            props.startMove(event);
        }
        moveTimer.value = null;
    }, 200); // 200ms delay - adjust if needed
}

function handlePointerUp(event: PointerEvent) {
    // Clear any existing timer
    if (moveTimer.value) {
        clearTimeout(moveTimer.value);
        moveTimer.value = null;
    }
}

function handleDoubleClick() {
    // Cancel the pending move operation
    if (moveTimer.value) {
        clearTimeout(moveTimer.value);
        moveTimer.value = null;
    }
    // Reset tap tracking to avoid conflicts
    lastTapTime.value = 0;
    lastTapPosition.value = { x: 0, y: 0 };
    // Start editing instead
    startEditing();
}

function startEditing() {
    isEditing.value = true;
    nextTick(() => {
        if (textArea.value) {
            textArea.value.focus();
        }
    });
}

function saveContent() {
    isEditing.value = false;
    updateTextWidget();
}

function updateTextWidget() {
    const formatting: TextWidgetFormatting = {
        fontFamily:
            fonts.find((f) => f.label === selectedFont.value)?.value ||
            "Arial, sans-serif",
        fontSize: fontSize.value,
        textColor: textColor.value,
        bold: isBold.value,
        italic: isItalic.value,
        underline: isUnderline.value,
        textAlign: textAlign.value,
    };

    textWidgetStore.updateTextWidgetContent(props.itemId, {
        text: content.value,
        formatting,
    });
}

function getTextStyle() {
    const fontFamily =
        fonts.find((f) => f.label === selectedFont.value)?.value ||
        "Arial, sans-serif";
    return {
        fontFamily,
        fontSize: `${fontSize.value}px`,
        color: textColor.value,
        fontWeight: isBold.value ? "bold" : "normal",
        fontStyle: isItalic.value ? "italic" : "normal",
        textDecoration: isUnderline.value ? "underline" : "none",
        textAlign: textAlign.value,
        lineHeight: "1.5",
    };
}

function getFormattedContent() {
    if (!content.value) return "";

    // Convert line breaks to <br> tags for multiline support
    return content.value.replace(/\n/g, "<br>");
}

function getAlignIcon() {
    const option = alignOptions.find((o) => o.value === textAlign.value);
    return option?.icon || "lucide:align-left";
}

// Alignment - cycle through options
function cycleAlign() {
    const currentIndex = alignOptions.findIndex(
        (option) => option.value === textAlign.value,
    );
    const nextIndex = (currentIndex + 1) % alignOptions.length;
    textAlign.value = alignOptions[nextIndex].value;
    updateTextWidget();
}
// Popover toggles
function toggleFontPopover(event: Event) {
    fontPopover.value.toggle(event);
}
function toggleSizePopover(event: Event) {
    sizePopover.value.toggle(event);
}
function toggleColorPopover(event: Event) {
    colorPopover.value.toggle(event);
}

// Font selection
function selectFont(font: { label: string; value: string }) {
    selectedFont.value = font.label;
    fontPopover.value.hide();
    updateTextWidget();
}
// Font size selection
function selectSize(size: { label: string; value: number }) {
    fontSize.value = size.value;
    sizePopover.value.hide();
    updateTextWidget();
}

// Get font size label for display
function getFontSizeLabel(size: number) {
    const sizeOption = sizeOptions.find((s) => s.value === size);
    return sizeOption?.label || "MD";
}

// Color selection
function selectColor(color: string) {
    textColor.value = color;
    customColor.value = color;
    updateTextWidget();
}

// Formatting toggles
function toggleBold() {
    isBold.value = !isBold.value;
    updateTextWidget();
}

function toggleItalic() {
    isItalic.value = !isItalic.value;
    updateTextWidget();
}

function toggleUnderline() {
    isUnderline.value = !isUnderline.value;
    updateTextWidget();
}

// Watch for prop changes
watch(
    () => props.initialText,
    (newText) => {
        if (newText !== undefined) {
            content.value = newText;
        }
    },
);

watch(
    () => props.initialFormatting,
    (newFormatting) => {
        if (newFormatting) {
            const fmt = newFormatting;
            selectedFont.value =
                fonts.find((f) => f.value === fmt.fontFamily)?.label || "Arial";
            fontSize.value = fmt.fontSize || 16;
            textColor.value = fmt.textColor || "#000000";
            isBold.value = fmt.bold || false;
            isItalic.value = fmt.italic || false;
            isUnderline.value = fmt.underline || false;
            textAlign.value = fmt.textAlign || "left";
            customColor.value = textColor.value;
        }
    },
    { deep: true },
);

// Add this to your script setup section
function closeAllPopovers() {
    fontPopover.value?.hide();
    sizePopover.value?.hide();
    colorPopover.value?.hide();
}

// Watch for selection changes and close popovers when deselected
watch(
    () => props.isSelected,
    (newSelected) => {
        if (!newSelected) {
            closeAllPopovers();
        }
    },
);
// Clean up timer on unmount
onUnmounted(() => {
    if (moveTimer.value) {
        clearTimeout(moveTimer.value);
    }
});
</script>

<style scoped>
.text-widget {
    padding: 0;
    position: relative;
    height: 100%;
}

.editing-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    z-index: 10;
}

.display-container {
    word-break: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
    position: relative;
    z-index: 10;
    cursor: move;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

.display-container:hover {
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
}

/* Allow text selection and show text cursor in edit mode */
.editing-container textarea {
    cursor: text;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
}

/* Custom scrollbar for textarea */
textarea::-webkit-scrollbar {
    width: 6px;
}

textarea::-webkit-scrollbar-track {
    background: transparent;
}

textarea::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
}
</style>
