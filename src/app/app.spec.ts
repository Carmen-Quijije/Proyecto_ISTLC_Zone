// Prueba básica que comprueba que el componente raíz puede construirse.
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  // Prepara un módulo de pruebas con el componente y un Router vacío.
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });
  // La aplicación debe crear una instancia válida sin lanzar errores.
  it('debe crear la aplicación', () =>
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy());
});
