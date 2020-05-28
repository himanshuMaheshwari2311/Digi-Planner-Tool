import { Injectable, Renderer2 } from '@angular/core';
import { fabric } from 'fabric';
import { ScalingService } from './scaling.service';
import { SocketService } from '../services/socket.service';
import { ShapeService } from './shape.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  selectedGroup: fabric.Group;
  givingId ;
  constructor(private scalingService: ScalingService, private ser: SocketService) { this.givingId = 0;}

  makeLine(coords: fabric.Point){
    return new fabric.Line(coords, {
      stroke: 'black',
      strokeWidth: 2,
      opacity: 0.6,
      selectable: false,
      preserveObjectStacking: true,
    });
  }

  createGroup(shape: fabric.Object, text: fabric.Itext, canvas: fabric.Canvas,
              x: number, y: number,
              connections: Array<{name: string, line: fabric.Line, connectedWith: fabric.Group, i: any}>, renderer: Renderer2){
    this.scalingService.scaleShapes(shape, text.getBoundingRect());
    const group = new fabric.Group([shape, text], {
      left: x,
      top: y,
      connections,
      isEditable: true,
    });
    group.id = this.givingId;
    text.id = this.givingId;
    group.type = "group";
    this.givingId += 1;
    group.setControlsVisibility(HideControls);
    this.addEventListeners(canvas, group, text, renderer);
    canvas.add(group);
    canvas.setActiveObject(group);
    return group;
  }

  doubleClickEvent(obj, handler){
    return () => {
      if (obj.clicked) { handler(obj); }
      else {
          obj.clicked = true;
          console.log(23);
          setTimeout(() => {
              obj.clicked = false;
          }, 500);
      }
    };
  }

  unGroup(group: fabric.Group, canvas: fabric.Canvas){
    this.selectedGroup = group;
    const items = group._objects;
    group._restoreObjectsState();
    canvas.remove(group);
    for (const item of items) {
        canvas.add(item);
    }
    canvas.renderAll();
  }

  regroup(shape: fabric.Object, text: fabric.IText, canvas: fabric.Canvas, renderer: Renderer2){
    canvas.remove(shape);
    canvas.remove(text);
    const groupCoord = this.selectedGroup.getPointByOrigin(0, 0);
    return this.createGroup(shape, text, canvas, groupCoord.x, groupCoord.y, this.selectedGroup.connections, renderer);
  }

  drawLineTwoPoints(canvas: fabric.Canvas) {
    const group1 = canvas.selectedElements[0];
    const group2 = canvas.selectedElements[1];
    console.log(group1);
    console.log(group2);
    const line = this.makeLine([group1.getCenterPoint().x, group1.getCenterPoint().y,
                                group2.getCenterPoint().x, group2.getCenterPoint().y]);
    canvas.add(line);
    canvas.sendToBack(line);
    group1.connections.push({name: 'p1', line, connectedGroup: group2, i: group2.id});
    group2.connections.push({name: 'p2', line, connectedGroup: group1, i: group1.id});

    canvas.connect = false;
    canvas.connectButtonText = 'Connect';
  }

  moveLines(group: fabric.Group){
    const newPoint = group.getCenterPoint();
    for (const connection of group.connections){
      if (connection.name === 'p1'){
        connection.line.set({
          x1: newPoint.x,
          y1: newPoint.y
        });
      }
      else{
        connection.line.set({
          x2: newPoint.x,
          y2: newPoint.y
        });
      }
    }
    console.log()
  }

  delete(canvas: fabric.Canvas){
    const group = canvas.getActiveObject();
    this.ser.deleteGroup(group.id);
    for (const connection of group.connections){
      // tslint:disable-next-line: forin
      for (const index in connection.connectedGroup.connections){
        const otherGroupConnections = connection.connectedGroup.connections;
        if (otherGroupConnections[index].connectedGroup === group){
          otherGroupConnections.splice(index, 1);
        }
      }
      canvas.remove(connection.line);
    }
    canvas.remove(group);
    canvas.renderAll();
  }

  addDeleteBtn(x: number, y: number, canvas: fabric.Canvas, renderer: Renderer2){
    document.getElementById('deleteBtn')?.remove();
    const btnLeft = x - 10;
    const btnTop = y - 10;
    const delteBtn = renderer.createElement('img');
    delteBtn.id = 'deleteBtn';
    delteBtn.src = '../assets/icons8-delete.svg';
    delteBtn.style = `position:absolute;
    top:${btnTop}px;
    left:${btnLeft}px;
    cursor:pointer;
    width:20px;
    height:20px;`;
    renderer.appendChild(document.getElementsByClassName('canvas-container')[0], delteBtn);
    document.getElementById('deleteBtn').addEventListener('click', (event) => {this.delete(canvas); });
  }

  addEventListeners(canvas: fabric.Canvas, group: fabric.Group, text: fabric.IText, renderer: Renderer2){
    group.on('selected', (e) => { this.addDeleteBtn(group.oCoords.tr.x, group.oCoords.tr.y, canvas, renderer); });

    group.on('modified', (e) => { this.addDeleteBtn(group.oCoords.tr.x, group.oCoords.tr.y, canvas, renderer); });

    group.on('scaling', (e) => { document.getElementById('deleteBtn')?.remove(); });

    group.on('moving', (e) => {
      document.getElementById('deleteBtn')?.remove();
      // console.log(group.connections);
      if (group.connections.length > 0){
        this.moveLines(group);
        canvas.renderAll();
      }
      console.log(11111);
    });

    group.on('rotating', (e) => { document.getElementById('deleteBtn')?.remove(); });

    group.on('removed', (e) => { document.getElementById('deleteBtn')?.remove(); });

    group.on('mousedown', this.doubleClickEvent(group, () => {
      if (canvas.connect){
        canvas.selectedElements.push(group);
        if (canvas.selectedElements.length === 2){ 
          this.drawLineTwoPoints(canvas); 
          this.ser.drawLines({f: canvas.selectedElements[0].id,
                              s: canvas.selectedElements[1].id});
          canvas.selectedElements.pop();
          canvas.selectedElements.pop();
        }
      }
      else{
        group.isEditable = false;
        this.ser.somethingModified(group.id);
        this.unGroup(group, canvas);
        var text1 = group._objects[1]; 
        text1.lockMovementX = false;
        text1.lockMovementY = false;
        canvas.setActiveObject(text1);
        text1.enterEditing();
        text1.selectAll();
      }
    }));

    canvas.on('mouse:down', (e) => {
      if (!canvas.getActiveObject()){ document.getElementById('deleteBtn')?.remove(); }
    });
  }

  changeColor(canvas: fabric.Canvas, color: string, renderer: Renderer2){
    const group = canvas.getActiveObject();
    if (group){
      const shape = group._objects[0];
      const text = group._objects[1];
      this.unGroup(group, canvas);
      shape.fill = color;
      this.regroup(shape, text, canvas, renderer);
    }
  }
}

const HideControls = {
  tr: false,
  bl: true,
  br: true,
  ml: true,
  mt: true,
  mr: true,
  mb: true,
  mtr: true
};