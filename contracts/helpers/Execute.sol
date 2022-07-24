//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.14;

enum EnumExecutionError {
    NO_ERROR,
    EMPTY_EXECUTION,
    LENGTH_MISMATCH,
    RUNTIME_ERROR
}

error ExecutionError(EnumExecutionError e);

abstract contract Execute {
    event ExecutionCompleted(bytes32 executionHash);

    function isValidExecution(
        address[] memory contractAddresses,
        uint256[] memory values,
        bytes[] memory calldatas
    ) public pure returns (bool, EnumExecutionError) {
        if (contractAddresses.length == 0) {
            return (false, EnumExecutionError.EMPTY_EXECUTION);
        } else if (contractAddresses.length != values.length) {
            return (false, EnumExecutionError.LENGTH_MISMATCH);
        } else if (contractAddresses.length != calldatas.length) {
            return (false, EnumExecutionError.LENGTH_MISMATCH);
        } else {
            return (true, EnumExecutionError.NO_ERROR);
        }
    }

    // ASSUMES THE EXECUTION IS VALID. CALL isValidExecution() before!
    function _hashExecution(
        address[] memory contractAddresses,
        uint256[] memory values,
        bytes[] memory calldatas
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(contractAddresses, values, calldatas));
    }

    function _execute__validated(
        address[] memory contractAddresses,
        uint256[] memory values,
        bytes[] memory calldatas
    ) internal {
        bytes32 executionHash = _hashExecution(
            contractAddresses,
            values,
            calldatas
        );
        for (uint256 i = 0; i < contractAddresses.length; i++) {
            (bool success, ) = contractAddresses[i].call{value: values[i]}(
                calldatas[i]
            );
            if (!success) {
                revert ExecutionError(EnumExecutionError.RUNTIME_ERROR);
            }
        }
        emit ExecutionCompleted(executionHash);
    }
}
