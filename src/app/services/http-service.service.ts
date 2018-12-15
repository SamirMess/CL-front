import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Position } from 'model/position';
import { LogService } from './log.service';
import { Path } from 'model/path';
import { Observable, zip, of, throwError } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(private http: HttpClient, private logService: LogService) { }

  public getNearestPosition(): Promise<Position> {
    return new Promise((res, rej) => {
      this.http.get('/nearestpoint').subscribe((position: Position) => {
        res(position);
      }, err => {
        this.logService.set("Impossible de récuperer le point le plus proche de votre position", err).asError().showPopUp().and.log();
        res(undefined);
      });
    });
  }

  public getAllPositions(): Promise<Position[]> {
    return new Promise((res, rej) => {
      this.http.get('/positions').subscribe((positions: Position[]) => {
        res(positions);
      }, err => {
        this.logService.set("Impossible de récuperer les positions", err).asError().showPopUp().and.log();
        res(undefined);
      });
    });
  }

  public getPath(positions: Position[]): Promise<Path[]> {
    return new Promise((res, rej) => {
      zip(...this.createRequestGPS(positions))
        .pipe(
          catchError(err => {
            this.logService.set("Impossible de récuperer les chemins", err).asError().showPopUp().and.log();
            rej(undefined);
            return throwError({});
          }),
          take(1)
        )
        .subscribe((paths: Path[][]) => {
          res(paths.reduce((accu, x) => accu.concat(x), []));
        });
    });
  }

  getTSP(positions: Position[]): Promise<Path[]> {
    return new Promise((res, rej) => {
      this.createRequestTSP(positions)
        .pipe(
          catchError(err => {
            this.logService.set("Impossible de récuperer les chemins", err).asError().showPopUp().and.log();
            rej(undefined);
            return throwError({});
          }),
          take(1)
        )
        .subscribe((paths: Path[]) => {
          res(paths);
        });
    });
  }

  private createRequestGPS(positions: Position[]): Observable<Path[]>[] {
    return positions.map((_, i) => {
      if (i < positions.length - 1) {
        const params: HttpParams = new HttpParams();
        params.set('idStart', positions[i].id.toString());
        params.set('idEnd', positions[i + 1].id.toString());
        return this.http.get<Path[]>('/path', { params: params });
      }
    }).filter(o => o);
  }

  private createRequestTSP(positions: Position[]): Observable<Path[]> {
    const params: HttpParams = new HttpParams();
    positions.map(position => params.append('id', position.id.toString()));
    return this.http.get<Path[]>('/tsp', { params: params });
  }
}
