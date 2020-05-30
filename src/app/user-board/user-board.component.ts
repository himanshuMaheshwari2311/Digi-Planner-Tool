import { Component, OnInit, Renderer2 } from '@angular/core';
import { fabric } from 'fabric';
import { ActivatedRoute } from '@angular/router';
import { ShapeService } from '../user-board-services/shape.service';
import { ConstantsService } from '../user-board-services/constants.service';
import { SocketService } from '../socket-services/socket.service';
import { UserSocketService } from '../socket-services/user-socket.service';
import { GroupService } from '../user-board-services/group.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-board',
  templateUrl: './user-board.component.html',
  styleUrls: ['./user-board.component.css'],
})
export class UserBoardComponent implements OnInit {
  canvas: fabric.Canvas;
  roomId: string;
  boardTitle: string;

  constructor(
    private shapeService: ShapeService,
    private renderer: Renderer2,
    private route: ActivatedRoute,
    public constants: ConstantsService,
    private socketService: SocketService,
    private userSocketService: UserSocketService,
    private groupService: GroupService,
    private snackBar:MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.roomId =
      this.route.snapshot.queryParamMap.get('room_code') || 'unknown';
    this.canvas = this.shapeService.initCanvas(this.roomId);
    this.userSocketService.init(this.canvas, this.renderer, this.roomId);
    this.groupService.setRoomId(this.roomId);
  }

  addObj(shape) {
    this.socketService.somethingAdded(
      shape,
      this.canvas.selectedColor,
      this.roomId
    );
  }

  addEllipse() {
    this.shapeService.addEllipse(this.canvas, this.renderer);
    this.addObj('ellipse');
  }

  addRectangle() {
    this.shapeService.addRectangle(this.canvas, this.renderer);
    this.addObj('rect');
  }

  addImage() {
    this.shapeService.addImage(this.canvas, '', this.renderer);
    this.addObj('image');
  }

  clear() {
      this.canvas.clear();
      this.shapeService.setBackground(this.canvas, 'assets');
      this.socketService.clearCanvas(this.canvas, this.roomId);
      document.getElementById('deleteBtn')?.remove();
  }
  showSnackBar(message: string, action: string): void {
    const snackBarRef = this.snackBar.open(message, action, {
      duration: 3000,
    });
    snackBarRef.onAction().subscribe(() => {
      console.log('triggered');
      this.clear();
    });
  }

  connect() {
    if (this.canvas.connect) {
      this.canvas.connect = false;
      this.canvas.connectButtonText = this.constants.disconnectText;
    } else {
      while (this.canvas.selectedElements.length > 0) {
        this.canvas.selectedElements.pop();
      }
      this.canvas.connect = true;
      this.canvas.connectButtonText = this.constants.disconnectText;
    }
  }

  changeColor(color: string) {
    this.shapeService.changeColor(this.canvas, color, this.renderer);
  }
  exportAsImage(canvasContent){
    if (canvasContent.msToBlob){
      const blob = canvasContent.msToBlob();
      window.navigator.msSaveBlob(blob, 'board-image.jpg');
    }
    else{
      const image = canvasContent
      .toDataURL( 'image/jpg', 1.0)
      .replace( 'image/jpg', 'image/octet-stream');
      const link = document.createElement('a');
      link.download = 'board-image.jpg';
      link.href = image;
      link.click();
    }
  }
  
}
