import { Edit } from './edit';
import { Save } from './save';
import './style.css';

window.wp.blocks.registerBlockType('icon-base/demo', {
  edit: Edit,
  save: Save,
});
