this is a wordpress plugin for icon called icon-base.

- always follow wordpress security best practise
- flag any security related issu as critical whenever found


- sqlite db contains static data and location is inside plugin, never git ignore

## Testing
- Test cases encode intentional decisions for features and bug fixes.
- If a test fails after a feature is modified, DO NOT auto-update the test to match the new behavior.
- Instead, ask whether the user wants to change the feature's behavior (then update the test) or whether it is a real bug being introduced (then fix the code).