import * as PIXI from 'pixi.js'
import { OnDownTriggerAction, OnHoldReleaseTriggerAction, OnUpTriggerAction } from './Actions'
import { ActionManager } from './ActionManager'
import { Canvas } from './Canvas'
import { ToolManager } from './Tools/ToolManager'
import { Viewport } from './Viewport'
import { ToolType } from './Tools/ToolTypes'

export class App {
    public ref: HTMLCanvasElement
    public application: PIXI.Application
    public canvas: Canvas
    public viewport: Viewport
    public actionManager: ActionManager
    public toolManager: ToolManager

    private afterInitCallbacks: Array<Function> = []

    init(ref: HTMLCanvasElement) {
        this.ref = ref

        PIXI.settings.FILTER_RESOLUTION = 1
        PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.HIGH
        PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.ON
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.LINEAR
        PIXI.settings.WRAP_MODE = PIXI.WRAP_MODES.REPEAT
        PIXI.utils.skipHello()

        this.application = new PIXI.Application({ view: this.ref, backgroundColor: 0x3E3E46, resizeTo: window, antialias: true })

        this.canvas = new Canvas()
        this.viewport = new Viewport(this.canvas)
        this.actionManager = new ActionManager()
        this.toolManager = new ToolManager()

        this.addActions()
        this.addTools()

        this.application.stage.addChild(this.viewport.container)

        this.application.start()

        this.afterInitCallbacks.forEach(fn => fn())
    }

    onAfterInit(fn: Function) {
        this.afterInitCallbacks.push(fn)
    }

    private addActions() {
        // navigation
        // pan
        this.actionManager.addAction(new OnDownTriggerAction([' '], () => this.toolManager.selectTool(ToolType.Pan)))
        this.actionManager.addAction(new OnUpTriggerAction([' '], () => this.toolManager.selectPreviousTool()))
        // zoom
        this.actionManager.addAction(new OnDownTriggerAction(['z'], () => this.toolManager.selectTool(ToolType.Zoom)))
        this.actionManager.addAction(new OnHoldReleaseTriggerAction(['z'], () => this.toolManager.selectPreviousTool()))
        // rotate
        this.actionManager.addAction(new OnDownTriggerAction(['arrowleft'], () => this.viewport.rotateLeft()))
        this.actionManager.addAction(new OnDownTriggerAction(['arrowright'], () => this.viewport.rotateRight()))
        // tools
        this.actionManager.addAction(new OnUpTriggerAction(['b'], () => this.toolManager.selectTool(ToolType.Brush)))
        this.actionManager.addAction(new OnUpTriggerAction(['e'], () => this.toolManager.selectTool(ToolType.Eraser)))
        // undo/redo
        this.actionManager.addAction(new OnUpTriggerAction(['control', 'z'], () => this.canvas.undo()))
        this.actionManager.addAction(new OnUpTriggerAction(['control', 'y'], () => this.canvas.redo()))
        this.actionManager.addAction(new OnUpTriggerAction(['control', 'shift', 'z'], () => this.canvas.redo()))
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
            .onMouseMove((e) => {
                if (e.buttons) {
                    app.viewport.zoom(e)
                }
            })

        // painting
        this.toolManager.addTool(ToolType.Brush)
            .onActivate(() => {
                console.log("Brush")
            })
            .onMouseDown((e: PointerEvent) => {
                app.canvas.startBrushStroke(e)
            })
            .onMouseMove((e: PointerEvent) => {
                app.canvas.updateBrushStroke(e)
            })
            .onMouseUp((e: PointerEvent) => {
                app.canvas.endBrushStroke(e)
            })
        this.toolManager.addTool(ToolType.Eraser)
            .onActivate(() => {
                console.log("Eraser")
            })

        this.toolManager.selectTool(ToolType.Brush)
    }
}

export const app = new App()