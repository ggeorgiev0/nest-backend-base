# NestJS Debugging Guide

This guide explains how to use the debugging capabilities configured in this project, including the F5 hotkey for quick debugging.

## VSCode Debugging Basics

### Starting a Debug Session

1. Press `F5` to start debugging with the default configuration
2. Select a debug configuration from the dropdown in the Debug panel
3. Click the green play button in the Debug panel

### Available Debug Configurations

| Configuration                     | Description                                            | Usage                            |
| --------------------------------- | ------------------------------------------------------ | -------------------------------- |
| Debug NestJS App                  | Launches the NestJS application with debugging enabled | Main application debugging       |
| Debug Current Test                | Runs and debugs the currently open test file           | For debugging specific tests     |
| Debug All Tests                   | Runs and debugs all tests                              | For debugging the test suite     |
| Debug Jest Tests (Node Inspector) | Uses Node's built-in inspector for debugging tests     | For advanced debugging scenarios |

### Setting Breakpoints

1. Click in the gutter (space to the left of line numbers) to set a breakpoint
2. Right-click on a breakpoint for additional options:
   - Conditional breakpoints: `feature === 'debugging'`
   - Hit count breakpoints: `>= 5`
   - Log points: `Value: {variableName}`

## Debugging Techniques

The following techniques can help you debug your NestJS application effectively:

### Inspecting Variables

- Set a breakpoint at a location where you want to inspect variables
- When execution pauses, examine the variables in the Variables panel
- Watch how values change during execution

### Conditional Breakpoints

- Right-click on a breakpoint and select "Edit Breakpoint"
- Set a condition like `user.id === 5` to break only when that condition is true
- Useful when debugging loops or repetitive calls

### Async Debugging

- Set breakpoints in async functions
- Use the call stack to navigate between promises
- Examine variables at each stage of async operations

## Debugging the NestJS Application

### Setting Up

1. Make sure the application builds successfully
2. Set breakpoints in the code you want to debug
3. Press `F5` and select "Debug NestJS App"

### Debugging Controllers

Controllers are great places to set breakpoints:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    // Set a breakpoint here
    return this.usersService.findOne(+id);
  }
}
```

### Debugging Services

Services contain business logic, making them important debugging targets:

```typescript
@Injectable()
export class UsersService {
  findOne(id: number) {
    // Set a breakpoint here
    return { id, name: 'Test User' };
  }
}
```

## Debugging Tests

1. Open a test file
2. Set breakpoints in the test or in the code being tested
3. Press `F5` and select "Debug Current Test"

Example:

```typescript
describe('UsersService', () => {
  it('should find a user by id', () => {
    // Set a breakpoint here
    const result = service.findOne(1);
    expect(result).toEqual({ id: 1, name: 'Test User' });
  });
});
```

## Advanced Debugging Techniques

### Using the Debug Console

While a program is paused at a breakpoint, you can:

1. Evaluate expressions
2. Call functions
3. Inspect objects

Example console commands:

```
> service.findOne(1)
> Object.keys(result)
> JSON.stringify(complexObject, null, 2)
```

### Watch Expressions

Add expressions to the Watch panel to monitor their values during execution:

1. In the Debug panel, click the + in the Watch section
2. Enter an expression like `user.profile.preferences`

### Debug Tasks Integration

This project includes tasks that can be combined with debugging:

- `build`: Compiles the application before debugging
- `test`: Runs tests with debugging support

## Troubleshooting

### Breakpoints Not Hit

If breakpoints aren't being hit:

1. Check if source maps are enabled
2. Ensure the code is actually executed
3. Try restarting the debug session

### Cannot Find Module Errors

If you encounter module resolution errors:

1. Make sure the application builds successfully
2. Check that path aliases are correctly configured
3. Rebuild the application before debugging

## Further Reading

- [VSCode Debugging Documentation](https://code.visualstudio.com/docs/editor/debugging)
- [NestJS Debugging Guide](https://docs.nestjs.com/recipes/debugging)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started)
