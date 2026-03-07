import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    // Rendereiza o componente base que inclui os Providers e a estrutura inicial
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });
});
