import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

@NgModule({ providers: [provideZonelessChangeDetection()] })
class ZonelessTestModule {}

getTestBed().initTestEnvironment([BrowserTestingModule, ZonelessTestModule], platformBrowserTesting());

// jsdom has no HTMLDialogElement.showModal/close; a minimal stand-in so the
// component can open. Focus trapping is still the browser's and is not emulated.
const dialogProto = globalThis.HTMLDialogElement?.prototype as HTMLDialogElement | undefined;
if (dialogProto && !dialogProto.showModal) {
  dialogProto.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialogProto.show = dialogProto.showModal;
  dialogProto.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
