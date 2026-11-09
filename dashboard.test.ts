import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React from 'react';
import {getDashboard} from '../src/lib/data';
import Dashboard from '../src/components/Dashboard';

test('dashboard interactions: chart mode, search/team/role filters, spotlight, match log and pagination',async()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/'});
 Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},HTMLElement:{value:dom.window.HTMLElement,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true,writable:true}});
 class Observer{observe(){}unobserve(){}disconnect(){}}
 Object.defineProperty(globalThis,'ResizeObserver',{value:Observer,configurable:true});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};
 const {render,fireEvent,within,cleanup}=await import('@testing-library/react');
 const view=render(React.createElement(Dashboard,{data:getDashboard()}));
 try{
  assert.equal(view.getAllByRole('button',{name:/View .+ game scores and breakdowns/}).length,15);
  assert.ok(view.getByRole('img',{name:'Cumulative fantasy team scores'}));
  fireEvent.click(view.getByRole('button',{name:'Per match'}));
  assert.ok(view.getByRole('img',{name:'Fantasy team points per match'}));
  fireEvent.change(view.getByLabelText('Search drafted players'),{target:{value:'Viper'}});
  assert.equal(view.getAllByRole('button',{name:/View .+ game scores and breakdowns/}).length,1);
  fireEvent.click(view.getByRole('button',{name:'View Viper game scores and breakdowns'}));
  const spotlight=dom.window.document.getElementById('spotlight')!;
  assert.ok(within(spotlight).getByRole('heading',{name:/Viper/}));
  assert.equal((view.getByLabelText('Filter match log by player') as HTMLSelectElement).value,getDashboard().players.find(p=>p.name==='Viper')!.id);
  assert.ok(view.getByText('1–11 of 11 player-games'));
  fireEvent.change(view.getByLabelText('Search drafted players'),{target:{value:''}});
  fireEvent.change(view.getByLabelText('Filter fantasy team'),{target:{value:'johan'}});
  fireEvent.change(view.getByLabelText('Filter role'),{target:{value:'sup'}});
  assert.equal(view.getAllByRole('button',{name:/View .+ game scores and breakdowns/}).length,1);
  assert.ok(view.getByRole('button',{name:'View Keria game scores and breakdowns'}));
  fireEvent.change(view.getByLabelText('Search drafted players'),{target:{value:'not-a-player'}});
  assert.ok(view.getByRole('heading',{name:'No players found.'}));
  fireEvent.click(view.getByRole('button',{name:'Clear filters'}));
  assert.equal(view.getAllByRole('button',{name:/View .+ game scores and breakdowns/}).length,15);
  fireEvent.change(view.getByLabelText('Filter match log by player'),{target:{value:'all'}});
  assert.ok(view.getByText('1–12 of 148 player-games'));
  fireEvent.click(view.getByRole('button',{name:'Next →'}));
  assert.ok(view.getByText('13–24 of 148 player-games'));
  fireEvent.click(view.getAllByRole('button',{name:'Cumulative'})[1]);
  assert.ok(view.getByRole('img',{name:'Viper cumulative points'}));
 }finally{cleanup();dom.window.close();}
});
