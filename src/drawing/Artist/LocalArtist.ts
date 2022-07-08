import { brushColor } from "../../lib/stores/brushSettings";
import { OnDownTriggerAction, OnUpTriggerAction, OnHoldReleaseTriggerAction } from "../Interactions/Actions/Actions";
import { app } from "../App";
import { ToolType } from "../Interactions/Tools/ToolTypes";
import { Artist } from "./Artist";
import { LocalEventSource } from "../Interactions/Events/LocalEventSource";
import { MessageTypes } from "../../../server/MessageTypes";
import { EventType } from "../Interactions/Tools/Tool";
import type { BrushSettings } from "src/models/BrushSettings";

export class LocalArtist extends Artist {

    constructor(id: string, name: string, owner: boolean, color: string) {
        super(id, name, owner, color, new LocalEventSource())

        this.addActions()
        this.addTools()

        this.setupRemote()
    }

    public changeTool(toolType: ToolType) {
        this.toolManager.selectTool(toolType)
        app.connection.sendMessage(MessageTypes.OnClientToolUpdate, {
            eventType: 'TOOL_TYPE_CHANGE',
            data: { toolType }
        })
    }

    public changeBrushSettings(updatedBrushSettings: BrushSettings) {
        
        this.brushSettings = updatedBrushSettings

        app.connection.sendMessage(MessageTypes.OnClientToolUpdate, {
            eventType: 'BRUSH_SETTINGS_CHANGE',
            data: { brushSettings: this.brushSettings }
        })
    }

    public changeEraserSettings(updatedEraserSettings: BrushSettings) {
        
        this.eraserSettings = updatedEraserSettings

        app.connection.sendMessage(MessageTypes.OnClientToolUpdate, {
            eventType: 'ERASER_SETTINGS_CHANGE',
            data: { eraserSettings: this.eraserSettings }
        })
    }

    private setupRemote() {
        this.eventSource.onMouseDown((e) => {
            const { buttons, button, x, y } = e
            app.connection.sendMessage(MessageTypes.OnClientEvent, {
                eventType: EventType.onMouseDown,
                data: { buttons, button, x, y }
            })
        })
        this.eventSource.onMouseMove((e) => {
            const { buttons, button, x, y, movementX, movementY, pressure } = e

            const pointInCanvasSpace = app.viewport.convertScreenToCanvas(x, y)

            app.connection.sendMessage(MessageTypes.OnClientEvent, {
                eventType: EventType.onMouseMove,
                data: { buttons, button, x: pointInCanvasSpace.x, y: pointInCanvasSpace.y, movementX, movementY, pressure }
            })
        })
        this.eventSource.onMouseUp((e) => {
            const { buttons, button, x, y, pressure } = e
            app.connection.sendMessage(MessageTypes.OnClientEvent, {
                eventType: EventType.onMouseUp,
                data: { buttons, button, x, y, pressure }
            })
        })
        this.eventSource.onKeyboardDown((e) => {
            const { key } = e
            app.connection.sendMessage(MessageTypes.OnClientEvent, {
                eventType: EventType.onKeyboardDown,
                data: { key }
            })
        })
        this.eventSource.onKeyboardUp((e) => {
            const { key } = e
            app.connection.sendMessage(MessageTypes.OnClientEvent, {
                eventType: EventType.onKeyboardUp,
                data: { key }
            })
        })
    }

    private addActions() {
        // navigation
        // pan
        this.actionManager.addAction(new OnDownTriggerAction([' '], () => this.toolManager.selectTool(ToolType.Pan)))
        this.actionManager.addAction(new OnUpTriggerAction([' '], () => this.toolManager.selectPreviousTool()))
        this.actionManager.addAction(new OnDownTriggerAction(['mousemiddle'], () => this.toolManager.selectTool(ToolType.Pan)))
        this.actionManager.addAction(new OnUpTriggerAction(['mousemiddle'], () => this.toolManager.selectPreviousTool()))

        // zoom
        this.actionManager.addAction(new OnDownTriggerAction(['z'], () => this.toolManager.selectTool(ToolType.Zoom)))
        this.actionManager.addAction(new OnHoldReleaseTriggerAction(['z'], () => this.toolManager.selectPreviousTool()))
        // rotate
        this.actionManager.addAction(new OnDownTriggerAction(['r'], () => this.toolManager.selectTool(ToolType.Rotate)))
        this.actionManager.addAction(new OnHoldReleaseTriggerAction(['r'], () => this.toolManager.selectPreviousTool()))
        this.actionManager.addAction(new OnDownTriggerAction(['arrowleft'], () => app.viewport.rotateLeft()))
        this.actionManager.addAction(new OnDownTriggerAction(['arrowright'], () => app.viewport.rotateRight()))
        // tools
        this.actionManager.addAction(new OnUpTriggerAction(['b'], () => this.toolManager.selectTool(ToolType.Brush)))
        this.actionManager.addAction(new OnUpTriggerAction(['e'], () => this.toolManager.selectTool(ToolType.Eraser)))
        this.actionManager.addAction(new OnDownTriggerAction(['alt'], () => this.toolManager.selectTool(ToolType.Eyedropper)))
        this.actionManager.addAction(new OnUpTriggerAction(['alt'], () => this.toolManager.selectPreviousTool()))
    }

    destroy(): void {
        this.eventSource.destroy()
    }

    private addTools() {
        // navigation
        this.toolManager.addTool(ToolType.Pan)
            .onMouseMove((e) => {
                if (e.buttons) {
                    app.viewport.pan(e)
                }
            })
        this.toolManager.addTool(ToolType.Zoom)
            .onMouseDown((e) => {
                app.viewport.scrubbyZoomStart(e)
            })
            .onMouseMove((e) => {
                if (e.buttons) {
                    app.viewport.scrubbyZoomUpdate(e)
                }
            })
            .onMouseUp((e) => {
                app.viewport.scrubbyZoomEnd(e)
            })

        this.toolManager.addTool(ToolType.WheelZoom, true)
            .onWheel((e: WheelEvent) => {
                app.viewport.wheelZoom(e)
            })
        this.toolManager.addTool(ToolType.Rotate)
            .onMouseDown((e) => {
                app.viewport.scrubbyRotateStart(e)
            })
            .onMouseMove((e) => {
                if (e.buttons) {
                    app.viewport.scrubbyRotateUpdate(e)
                }
            })
            .onMouseUp((e) => {
                app.viewport.scrubbyRotateEnd(e)
            })

        // painting
        this.toolManager.addTool(ToolType.Brush)
            .onMouseDown((e: PointerEvent) => {
                if (e.button === 0) {
                    app.canvas.startBrushStroke(e, this)
                }
            })
            .onMouseMove((e: PointerEvent) => {
                app.canvas.updateBrushStroke(e, this)
            })
            .onMouseUp((e: PointerEvent) => {
                if (e.button === 0) {
                    app.canvas.endBrushStroke(e, this)
                }
            })
        this.toolManager.addTool(ToolType.Eraser)
            .onMouseDown((e: PointerEvent) => {
                if (e.button === 0) app.canvas.startBrushStroke(e, this, true)
            })
            .onMouseMove((e: PointerEvent) => {
                app.canvas.updateBrushStroke(e, this, true)
            })
            .onMouseUp((e: PointerEvent) => {
                if (e.button === 0) app.canvas.endBrushStroke(e, this, true)
            })

        // other tools
        this.toolManager.addTool(ToolType.Eyedropper)
            .onMouseUp(e => {
                const hex = app.viewport.colorAt(e)
                brushColor.set(hex)
            })

        this.toolManager.selectTool(ToolType.Brush)
    }
}