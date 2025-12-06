import {Component, OnInit, ViewChild, ChangeDetectorRef} from '@angular/core';

import { GuestbookService } from './guestbook.service';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
export interface GuestbookData {
  name: string;
  message: string;
  visitingCard?: {
    fileUrl: string;
    fileName: string;
    originalName: string;
  };
}

export interface VisitingCardData {
  name: string;
  message: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
}

/**
 * @title Data table with sorting, pagination, and filtering.
 */

 /**
 * @title Basic use of `<table mat-table>`
 */
@Component({
  selector: 'app-guestbook',
  styleUrls: ['./guestbook.component.css'],
  templateUrl: './guestbook.component.html',
})

export class GuestbookComponent implements OnInit {
  displayedColumns: string[] = ['name', 'message', 'visitingCard'];
  visitingCardColumns: string[] = ['name', 'message', 'visitingCard', 'uploadedAt'];

  dataSource: MatTableDataSource<GuestbookData>;
  visitingCardDataSource: MatTableDataSource<VisitingCardData>;

  name: string;
  message:string;
  
  visitingCardName: string;
  visitingCardMessage: string;
  selectedFile: File | null = null;
  
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  constructor(private guestbookService:GuestbookService) {
 
  }

  ngOnInit() {
    this.guestbookService.getGuestbook().subscribe(guestbook=>{
      this.dataSource = new MatTableDataSource(guestbook);
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    })

    this.loadVisitingCards();
  }

  loadVisitingCards() {
    this.guestbookService.getVisitingCards().subscribe(cards => {
      this.visitingCardDataSource = new MatTableDataSource(cards);
    });
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }


  onSubmit (myform: NgForm) {

    this.guestbookService.postGuestbook({name:this.name,message:this.message}).subscribe(result=>{
      this.guestbookService.getGuestbook().subscribe(guestbook=>{
        this.dataSource = new MatTableDataSource(guestbook);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.name='';
        this.message='';
      })
    })
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check if it's an image
      if (file.type.startsWith('image/')) {
        this.selectedFile = file;
      } else {
        alert('Please select an image file');
        this.selectedFile = null;
      }
    }
  }

  onSubmitVisitingCard(visitingCardForm: NgForm) {
    if (!this.selectedFile) {
      alert('Please select a visiting card image');
      return;
    }

    const formData = new FormData();
    formData.append('visitingCard', this.selectedFile);
    formData.append('name', this.visitingCardName || 'Anonymous');
    formData.append('message', this.visitingCardMessage || '');

    this.guestbookService.postVisitingCard(formData).subscribe(result => {
      // Refresh both visiting cards and guestbook to show the card next to messages
      this.loadVisitingCards();
      this.guestbookService.getGuestbook().subscribe(guestbook => {
        this.dataSource = new MatTableDataSource(guestbook);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
      this.visitingCardName = '';
      this.visitingCardMessage = '';
      this.selectedFile = null;
      // Reset file input
      const fileInput = document.getElementById('visitingCardInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      alert('Visiting card uploaded successfully!');
    }, error => {
      console.error('Error uploading visiting card:', error);
      alert('Error uploading visiting card. Please try again.');
    });
  }

  openImage(url: string) {
    window.open(url, '_blank');
  }

  downloadVisitingCard(card: { fileUrl: string; fileName: string; originalName: string }) {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = card.fileUrl;
    link.download = card.originalName || card.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}


